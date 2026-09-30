import { Injectable } from '@nestjs/common';

import { XMLParser } from 'fast-xml-parser';

import {
  CalDavCalendarCollection,
  CalDavCalendarResource,
  CalDavSyncResult,
} from './caldav.types';

export const CALDAV_OPTIONS_HEADERS = {
  Allow: 'OPTIONS, PROPFIND, REPORT, GET, HEAD',
  DAV: '1, calendar-access, sync-collection',
  'MS-Author-Via': 'DAV',
};

interface CalDavCalendarQuery {
  type: 'calendar-query';
  includeCalendarData: boolean;
  timeRange: { start?: Date; end?: Date } | null;
}

interface CalDavCalendarMultiGet {
  type: 'calendar-multiget';
  includeCalendarData: boolean;
  hrefs: string[];
}

interface CalDavSyncCollection {
  type: 'sync-collection';
  includeCalendarData: boolean;
  syncToken: string | null;
}

type CalDavReportRequest =
  CalDavCalendarQuery | CalDavCalendarMultiGet | CalDavSyncCollection;

interface CalDavReportResult {
  resources: CalDavCalendarResource[];
  missingHrefs: string[];
}

interface CalDavPropfindRequest {
  mode: 'allprop' | 'prop' | 'propname';
  properties: string[];
}

interface CalDavXmlProperty {
  name: string;
  value: string;
}

@Injectable()
export class CalDavService {
  private readonly xmlParser = new XMLParser({
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  getOptionsHeaders(): Record<string, string> {
    return CALDAV_OPTIONS_HEADERS;
  }

  /**
   * Извлекает только имена свойств из PROPFIND. Они нужны и для корректного
   * propstat-ответа, и для безопасной диагностики без записи XML body в лог.
   */
  parsePropfindRequest(body: unknown): CalDavPropfindRequest | null {
    if (typeof body !== 'string' || !body.trim()) {
      return { mode: 'allprop', properties: [] };
    }

    let document: Record<string, unknown>;
    try {
      document = this.xmlParser.parse(body) as Record<string, unknown>;
    } catch {
      return null;
    }

    const propfind = document.propfind;
    if (!this.isRecord(propfind)) {
      return null;
    }
    if ('propname' in propfind) {
      return { mode: 'propname', properties: [] };
    }
    if ('allprop' in propfind) {
      return { mode: 'allprop', properties: [] };
    }
    if (!('prop' in propfind)) {
      return null;
    }

    const prop = propfind.prop;
    const properties = this.isRecord(prop)
      ? Object.keys(prop).filter((property) => !property.startsWith('@_'))
      : [];

    return { mode: 'prop', properties };
  }

  /**
   * Разбирает обязательные read-only REPORT из RFC 4791. Неподдерживаемые
   * формы запроса возвращают null, чтобы контроллер отдал 400.
   */
  parseReportRequest(body: unknown): CalDavReportRequest | null {
    if (typeof body !== 'string' || !body.trim()) {
      return null;
    }

    let document: Record<string, unknown>;
    try {
      document = this.xmlParser.parse(body) as Record<string, unknown>;
    } catch {
      return null;
    }

    const calendarQuery = document['calendar-query'];
    if (this.isRecord(calendarQuery)) {
      const timeRange = this.getTimeRange(calendarQuery);
      if (timeRange === undefined) {
        return null;
      }

      return {
        type: 'calendar-query',
        includeCalendarData: this.hasElement(calendarQuery, 'calendar-data'),
        timeRange,
      };
    }

    const calendarMultiGet = document['calendar-multiget'];
    if (this.isRecord(calendarMultiGet)) {
      const hrefs = this.getElementTextValues(calendarMultiGet, 'href');
      if (hrefs.length === 0) {
        return null;
      }

      return {
        type: 'calendar-multiget',
        includeCalendarData: this.hasElement(calendarMultiGet, 'calendar-data'),
        hrefs,
      };
    }

    const syncCollection = document['sync-collection'];
    if (this.isRecord(syncCollection)) {
      const syncLevel = syncCollection['sync-level'];
      const syncToken = syncCollection['sync-token'];
      if (
        (syncLevel !== '1' && syncLevel !== 1) ||
        (syncToken !== '' && typeof syncToken !== 'string')
      ) {
        return null;
      }

      return {
        type: 'sync-collection',
        includeCalendarData: this.hasElement(syncCollection, 'calendar-data'),
        syncToken: syncToken || null,
      };
    }

    return null;
  }

  /** Выбирает resources, которые должны попасть в ответ конкретного REPORT. */
  getReportResources(
    collection: CalDavCalendarCollection,
    report: CalDavReportRequest,
    depth: string | undefined,
  ): CalDavReportResult {
    if (report.type === 'sync-collection') {
      return { resources: [], missingHrefs: [] };
    }
    if (report.type === 'calendar-multiget') {
      const resourcesByName = new Map(
        collection.resources.map((resource) => [resource.name, resource]),
      );
      const resources: CalDavCalendarResource[] = [];
      const missingHrefs: string[] = [];
      for (const href of report.hrefs) {
        const resource = resourcesByName.get(
          this.getResourceNameFromHref(href),
        );
        if (resource) {
          resources.push(resource);
        } else {
          missingHrefs.push(href);
        }
      }
      return { resources, missingHrefs };
    }

    // RFC 4791: при отсутствии Depth предполагается 0, то есть дочерние
    // calendar object resources коллекции не выбираются.
    if ((depth ?? '0') !== '1') {
      return { resources: [], missingHrefs: [] };
    }

    if (!report.timeRange) {
      return { resources: collection.resources, missingHrefs: [] };
    }

    const resources = collection.resources.filter((resource) => {
      const startsBeforeEnd =
        !report.timeRange?.end || resource.startsAt < report.timeRange.end;
      const endsAfterStart =
        !report.timeRange?.start || resource.endsAt > report.timeRange.start;

      return startsBeforeEnd && endsAfterStart;
    });

    return { resources, missingHrefs: [] };
  }

  /** Формирует properties CalDAV-коллекции и её дочерних event resources. */
  createCollectionPropfindResponse(
    collectionHref: string,
    collection: CalDavCalendarCollection,
    depth: string | undefined,
    syncToken: string,
    principalHref?: string,
    request: CalDavPropfindRequest = { mode: 'allprop', properties: [] },
  ): string {
    const responses = [
      this.createCollectionResponse(
        collectionHref,
        collection.name,
        collection.description,
        syncToken,
        principalHref,
        request,
      ),
    ];
    if (depth === '1' || depth === 'infinity') {
      responses.push(
        ...collection.resources.map((resource) =>
          this.createCalendarObjectPropfindResponse(
            `${collectionHref}${resource.name}`,
            resource,
            request,
          ),
        ),
      );
    }

    return this.createMultistatus(responses);
  }

  /**
   * Формирует виртуальный WebDAV principal: фактический пользователь не
   * хранится, но CalDAV-клиент получает стандартный путь к calendar-home-set.
   */
  createPrincipalPropfindResponse(
    principalHref: string,
    calendarHomeHref: string,
    request: CalDavPropfindRequest = { mode: 'allprop', properties: [] },
  ): string {
    return this.createMultistatus([
      this.createPropfindResponse(
        principalHref,
        [
          {
            name: 'resourcetype',
            value: '<d:resourcetype><d:principal/></d:resourcetype>',
          },
          {
            name: 'displayname',
            value: '<d:displayname>YSTUty Calendar</d:displayname>',
          },
          {
            name: 'calendar-home-set',
            value: `<c:calendar-home-set><d:href>${this.escapeXml(calendarHomeHref)}</d:href></c:calendar-home-set>`,
          },
        ],
        request,
      ),
    ]);
  }

  /** Возвращает calendar home и его единственную read-only коллекцию. */
  createCalendarHomePropfindResponse(
    calendarHomeHref: string,
    collectionHref: string,
    collection: CalDavCalendarCollection,
    depth: string | undefined,
    syncToken: string,
    principalHref: string,
    request: CalDavPropfindRequest = { mode: 'allprop', properties: [] },
  ): string {
    const responses = [
      this.createPropfindResponse(
        calendarHomeHref,
        [
          {
            name: 'resourcetype',
            value: '<d:resourcetype><d:collection/></d:resourcetype>',
          },
          {
            name: 'displayname',
            value: '<d:displayname>YSTUty Calendars</d:displayname>',
          },
          {
            name: 'current-user-principal',
            value: `<d:current-user-principal><d:href>${this.escapeXml(principalHref)}</d:href></d:current-user-principal>`,
          },
        ],
        request,
      ),
    ];
    if (depth === '1' || depth === 'infinity') {
      responses.push(
        this.createCollectionResponse(
          collectionHref,
          collection.name,
          collection.description,
          syncToken,
          principalHref,
          request,
        ),
      );
    }

    return this.createMultistatus(responses);
  }

  /** Возвращает свойства единственного calendar object resource. */
  createCalendarResourcePropfindResponse(
    resourceHref: string,
    resource: CalDavCalendarResource,
    request: CalDavPropfindRequest = { mode: 'allprop', properties: [] },
  ): string {
    return this.createMultistatus([
      this.createCalendarObjectPropfindResponse(
        resourceHref,
        resource,
        request,
      ),
    ]);
  }

  /** Формирует RFC 4791 response на calendar-query или calendar-multiget. */
  createReportResponse(
    collectionHref: string,
    reportResult: CalDavReportResult,
    includeCalendarData: boolean,
    syncToken?: string,
  ): string {
    return this.createMultistatus(
      [
        ...reportResult.resources.map((resource) =>
          this.createCalendarObjectResponse(
            `${collectionHref}${resource.name}`,
            resource,
            includeCalendarData,
            true,
          ),
        ),
        ...reportResult.missingHrefs.map((href) =>
          this.createNotFoundResponse(href),
        ),
      ],
      syncToken,
    );
  }

  /** Формирует RFC 6578 response с изменениями после sync-token клиента. */
  createSyncCollectionResponse(
    collectionHref: string,
    syncResult: Extract<CalDavSyncResult, { isValid: true }>,
    includeCalendarData: boolean,
  ): string {
    return this.createReportResponse(
      collectionHref,
      {
        resources: syncResult.resources,
        missingHrefs: syncResult.deletedResourceNames.map(
          (name) => `${collectionHref}${name}`,
        ),
      },
      includeCalendarData,
      syncResult.token,
    );
  }

  createInvalidSyncTokenResponse(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <d:error xmlns:d="DAV:"><d:valid-sync-token/></d:error>`;
  }

  /** Возвращает стабильное время изменения из DTSTAMP или даты начала события. */
  getResourceLastModified(resource: CalDavCalendarResource): Date {
    const dtstamp = resource.content.match(/^DTSTAMP:(\d{8}T\d{6}Z)$/m)?.[1];

    return (dtstamp && this.parseCalDavDateTime(dtstamp)) || resource.startsAt;
  }

  private createCollectionResponse(
    collectionHref: string,
    calendarName: string,
    calendarDescription: string,
    syncToken: string,
    principalHref?: string,
    request: CalDavPropfindRequest = { mode: 'allprop', properties: [] },
  ): string {
    const properties: CalDavXmlProperty[] = [
      {
        name: 'resourcetype',
        value: '<d:resourcetype><d:collection/><c:calendar/></d:resourcetype>',
      },
      {
        name: 'displayname',
        value: `<d:displayname>${this.escapeXml(`YSTUty [${calendarName}]`)}</d:displayname>`,
      },
      {
        name: 'calendar-description',
        value: `<c:calendar-description xml:lang="ru">${this.escapeXml(calendarDescription)}</c:calendar-description>`,
      },
      {
        name: 'supported-calendar-component-set',
        value:
          '<c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>',
      },
      {
        name: 'supported-calendar-data',
        value:
          '<c:supported-calendar-data><c:calendar-data content-type="text/calendar" version="2.0"/></c:supported-calendar-data>',
      },
      {
        name: 'sync-token',
        value: `<d:sync-token>${this.escapeXml(syncToken)}</d:sync-token>`,
      },
      {
        name: 'getctag',
        value: `<cs:getctag>${this.escapeXml(syncToken)}</cs:getctag>`,
      },
      {
        name: 'supported-report-set',
        value: `<d:supported-report-set>
          <d:supported-report><d:report><c:calendar-query/></d:report></d:supported-report>
          <d:supported-report><d:report><c:calendar-multiget/></d:report></d:supported-report>
          <d:supported-report><d:report><d:sync-collection/></d:report></d:supported-report>
        </d:supported-report-set>`,
      },
    ];
    if (principalHref) {
      properties.push({
        name: 'current-user-principal',
        value: `<d:current-user-principal><d:href>${this.escapeXml(principalHref)}</d:href></d:current-user-principal>`,
      });
    }

    return this.createPropfindResponse(collectionHref, properties, request);
  }

  /** Формирует `propstat` согласно запрошенному набору WebDAV-свойств. */
  private createPropfindResponse(
    href: string,
    properties: CalDavXmlProperty[],
    request: CalDavPropfindRequest,
  ): string {
    const propertiesByName = new Map(
      properties.map((property) => [property.name, property]),
    );
    const requestedProperties =
      request.mode === 'allprop' || request.mode === 'propname'
        ? properties
        : request.properties
            .map((property) => propertiesByName.get(property))
            .filter((property): property is CalDavXmlProperty => !!property);
    const unsupportedProperties =
      request.mode === 'prop'
        ? request.properties.filter(
            (property) => !propertiesByName.has(property),
          )
        : [];
    const propertyValues = requestedProperties.map((property) =>
      request.mode === 'propname'
        ? this.createEmptyProperty(property.name)
        : property.value,
    );
    const successPropstat = propertyValues.length
      ? `<d:propstat><d:prop>${propertyValues.join('')}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>`
      : '';
    const notFoundPropstat = unsupportedProperties.length
      ? `<d:propstat><d:prop>${unsupportedProperties.map((property) => this.createEmptyProperty(property)).join('')}</d:prop><d:status>HTTP/1.1 404 Not Found</d:status></d:propstat>`
      : '';

    return `<d:response><d:href>${this.escapeXml(href)}</d:href>${successPropstat}${notFoundPropstat}</d:response>`;
  }

  private createEmptyProperty(name: string): string {
    const safeName = name.match(/^[a-zA-Z][a-zA-Z0-9-]*$/) ? name : 'unknown';

    return `<d:${safeName}/>`;
  }

  private createCalendarObjectPropfindResponse(
    href: string,
    resource: CalDavCalendarResource,
    request: CalDavPropfindRequest,
  ): string {
    return this.createPropfindResponse(
      href,
      [
        { name: 'resourcetype', value: '<d:resourcetype/>' },
        {
          name: 'displayname',
          value: `<d:displayname>${this.escapeXml(resource.name)}</d:displayname>`,
        },
        {
          name: 'getcontenttype',
          value:
            '<d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype>',
        },
        {
          name: 'getcontentlength',
          value: `<d:getcontentlength>${Buffer.byteLength(
            resource.content,
            'utf8',
          )}</d:getcontentlength>`,
        },
        { name: 'getetag', value: `<d:getetag>${resource.etag}</d:getetag>` },
        {
          name: 'getlastmodified',
          value: `<d:getlastmodified>${this.getResourceLastModified(
            resource,
          ).toUTCString()}</d:getlastmodified>`,
        },
      ],
      request,
    );
  }

  private createCalendarObjectResponse(
    href: string,
    resource: CalDavCalendarResource,
    includeCalendarData = false,
    onlyRequestedReportProperties = false,
  ): string {
    const calendarData = includeCalendarData
      ? `<c:calendar-data><![CDATA[${resource.content.replaceAll(']]>', ']]]]><![CDATA[>')}]]></c:calendar-data>`
      : '';
    const metadata = onlyRequestedReportProperties
      ? ''
      : `
            <d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype>
            <d:getcontentlength>${Buffer.byteLength(resource.content, 'utf8')}</d:getcontentlength>`;

    return `
      <d:response>
        <d:href>${this.escapeXml(href)}</d:href>
        <d:propstat>
          <d:prop>
            ${metadata}
            <d:getetag>${resource.etag}</d:getetag>
            ${calendarData}
          </d:prop>
          <d:status>HTTP/1.1 200 OK</d:status>
        </d:propstat>
      </d:response>
    `;
  }

  private createNotFoundResponse(href: string): string {
    return `
      <d:response>
        <d:href>${this.escapeXml(href)}</d:href>
        <d:status>HTTP/1.1 404 Not Found</d:status>
      </d:response>
    `;
  }

  private getTimeRange(
    calendarQuery: Record<string, unknown>,
  ): { start?: Date; end?: Date } | null | undefined {
    const timeRange = this.findElement(calendarQuery, 'time-range');
    if (!timeRange) {
      return null;
    }
    if (!this.isRecord(timeRange)) {
      return undefined;
    }

    const start = this.parseCalDavDateTime(timeRange['@_start']);
    const end = this.parseCalDavDateTime(timeRange['@_end']);
    if ((timeRange['@_start'] && !start) || (timeRange['@_end'] && !end)) {
      return undefined;
    }

    return { start: start ?? undefined, end: end ?? undefined };
  }

  private parseCalDavDateTime(value: unknown): Date | null {
    if (typeof value !== 'string') {
      return null;
    }
    const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (!match) {
      return null;
    }

    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getResourceNameFromHref(href: string): string {
    try {
      const pathname = new URL(href, 'https://ical.ystuty.ru').pathname;
      return decodeURIComponent(
        pathname.split('/').filter(Boolean).at(-1) ?? '',
      );
    } catch {
      return '';
    }
  }

  private hasElement(value: unknown, name: string): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.entries(value).some(([key, child]) => {
      if (key === name) {
        return true;
      }
      return Array.isArray(child)
        ? child.some((item) => this.hasElement(item, name))
        : this.hasElement(child, name);
    });
  }

  private findElement(value: unknown, name: string): unknown | null {
    if (!this.isRecord(value)) {
      return null;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === name) {
        return child;
      }
      const nested = Array.isArray(child)
        ? child.map((item) => this.findElement(item, name)).find(Boolean)
        : this.findElement(child, name);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  private getElementTextValues(value: unknown, name: string): string[] {
    if (!this.isRecord(value)) {
      return [];
    }

    return Object.entries(value).flatMap(([key, child]) => {
      if (key === name) {
        return (Array.isArray(child) ? child : [child]).flatMap((item) =>
          typeof item === 'string' ? [item] : [],
        );
      }
      return Array.isArray(child)
        ? child.flatMap((item) => this.getElementTextValues(item, name))
        : this.getElementTextValues(child, name);
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private createMultistatus(responses: string[], syncToken?: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <d:multistatus
        xmlns:d="DAV:"
        xmlns:c="urn:ietf:params:xml:ns:caldav"
        xmlns:cs="http://calendarserver.org/ns/">
        ${responses.join('')}
        ${syncToken ? `<d:sync-token>${this.escapeXml(syncToken)}</d:sync-token>` : ''}
      </d:multistatus>`;
  }

  private escapeXml(value: string): string {
    return value.replace(
      /[<>&'"]/g,
      (character) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": '&apos;',
          '"': '&quot;',
        })[character] as string,
    );
  }
}
