import { Injectable } from '@nestjs/common';

import { XMLParser } from 'fast-xml-parser';

import {
  CalDavCalendarCollection,
  CalDavCalendarResource,
} from './caldav.types';

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

type CalDavReportRequest = CalDavCalendarQuery | CalDavCalendarMultiGet;

interface CalDavReportResult {
  resources: CalDavCalendarResource[];
  missingHrefs: string[];
}

@Injectable()
export class CalDavService {
  private readonly xmlParser = new XMLParser({
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  getOptionsHeaders(): Record<string, string> {
    return {
      Allow: 'OPTIONS, PROPFIND, REPORT, GET, HEAD',
      DAV: '1, calendar-access',
      'MS-Author-Via': 'DAV',
    };
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

    return null;
  }

  /** Выбирает resources, которые должны попасть в ответ конкретного REPORT. */
  getReportResources(
    collection: CalDavCalendarCollection,
    report: CalDavReportRequest,
    depth: string | undefined,
  ): CalDavReportResult {
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
  ): string {
    const responses = [
      this.createCollectionResponse(
        collectionHref,
        collection.name,
        collection.description,
      ),
    ];
    if (depth === '1' || depth === 'infinity') {
      responses.push(
        ...collection.resources.map((resource) =>
          this.createCalendarObjectResponse(
            `${collectionHref}${resource.name}`,
            resource,
          ),
        ),
      );
    }

    return this.createMultistatus(responses);
  }

  /** Возвращает свойства единственного calendar object resource. */
  createCalendarResourcePropfindResponse(
    resourceHref: string,
    resource: CalDavCalendarResource,
  ): string {
    return this.createMultistatus([
      this.createCalendarObjectResponse(resourceHref, resource),
    ]);
  }

  /** Формирует RFC 4791 response на calendar-query или calendar-multiget. */
  createReportResponse(
    collectionHref: string,
    reportResult: CalDavReportResult,
    includeCalendarData: boolean,
  ): string {
    return this.createMultistatus([
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
    ]);
  }

  private createCollectionResponse(
    collectionHref: string,
    calendarName: string,
    calendarDescription: string,
  ): string {
    return `
      <d:response>
        <d:href>${this.escapeXml(collectionHref)}</d:href>
        <d:propstat>
          <d:prop>
            <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
            <d:displayname>${this.escapeXml(`YSTUty [${calendarName}]`)}</d:displayname>
            <c:calendar-description xml:lang="ru">${this.escapeXml(calendarDescription)}</c:calendar-description>
            <c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>
            <c:supported-calendar-data><c:calendar-data content-type="text/calendar" version="2.0"/></c:supported-calendar-data>
            <d:supported-report-set>
              <d:supported-report><d:report><c:calendar-query/></d:report></d:supported-report>
              <d:supported-report><d:report><c:calendar-multiget/></d:report></d:supported-report>
            </d:supported-report-set>
          </d:prop>
          <d:status>HTTP/1.1 200 OK</d:status>
        </d:propstat>
      </d:response>
    `;
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

  private createMultistatus(responses: string[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <d:multistatus
        xmlns:d="DAV:"
        xmlns:c="urn:ietf:params:xml:ns:caldav">
        ${responses.join('')}
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
