import { Injectable } from '@nestjs/common';

import { createHash } from 'crypto';

interface CalendarResource {
  readonly content: string;
  readonly etag: string;
}

@Injectable()
export class CalDavService {
  /**
   * Строит ETag по фактическому iCalendar-содержимому.
   */
  createCalendarResource(content: string): CalendarResource {
    const etag = createHash('sha256').update(content).digest('hex');
    return { content, etag: `"${etag}"` };
  }

  getOptionsHeaders(): Record<string, string> {
    return {
      Allow: 'OPTIONS, PROPFIND, REPORT, GET, HEAD',
      DAV: '1, calendar-access',
      'MS-Author-Via': 'DAV',
    };
  }

  /**
   * Формирует WebDAV properties календарной коллекции и её единственного
   * read-only iCalendar-ресурса.
   */
  createPropfindResponse(
    collectionHref: string,
    groupName: string,
    calendar: CalendarResource,
    depth: string | undefined,
  ): string {
    const responses = [
      this.createCollectionResponse(collectionHref, groupName),
    ];
    if (depth === '1' || depth === 'infinity') {
      responses.push(
        this.createCalendarObjectResponse(
          `${collectionHref}calendar.ics`,
          calendar,
        ),
      );
    }

    return this.createMultistatus(responses);
  }

  /**
   * Возвращает календарь как единственный календарный объект для REPORT.
   */
  createReportResponse(
    collectionHref: string,
    calendar: CalendarResource,
  ): string {
    return this.createMultistatus([
      this.createCalendarObjectResponse(
        `${collectionHref}calendar.ics`,
        calendar,
        true,
      ),
    ]);
  }

  private createCollectionResponse(
    collectionHref: string,
    groupName: string,
  ): string {
    return `
      <d:response>
        <d:href>${this.escapeXml(collectionHref)}</d:href>
        <d:propstat>
          <d:prop>
            <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
            <d:displayname>${this.escapeXml(`YSTUty [${groupName}]`)}</d:displayname>
            <c:calendar-description xml:lang="ru">Расписание занятий ЯГТУ для группы ${this.escapeXml(groupName)}</c:calendar-description>
            <c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>
            <c:supported-calendar-data><c:calendar-data content-type="text/calendar" version="2.0"/></c:supported-calendar-data>
          </d:prop>
          <d:status>HTTP/1.1 200 OK</d:status>
        </d:propstat>
      </d:response>
    `;
  }

  private createCalendarObjectResponse(
    href: string,
    calendar: CalendarResource,
    includeCalendarData = false,
  ): string {
    const calendarData = includeCalendarData
      ? `<c:calendar-data><![CDATA[${calendar.content.replaceAll(']]>', ']]]]><![CDATA[>')}]]></c:calendar-data>`
      : '';

    return `
      <d:response>
        <d:href>${this.escapeXml(href)}</d:href>
        <d:propstat>
          <d:prop>
            <d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype>
            <d:getetag>${calendar.etag}</d:getetag>
            ${calendarData}
          </d:prop>
          <d:status>HTTP/1.1 200 OK</d:status>
        </d:propstat>
      </d:response>
    `;
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
