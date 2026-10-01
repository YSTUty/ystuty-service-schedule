import { CalDavService } from './caldav.service';
import { CalDavCalendarCollection } from './caldav.types';

describe('CalDavService', () => {
  const collection: CalDavCalendarCollection = {
    name: 'ЦИС-26',
    description: 'Расписание занятий ЯГТУ для группы ЦИС-26',
    resources: [
      {
        name: 'first.ics',
        uid: 'first@ical.ystuty.ru',
        content:
          'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:first@ical.ystuty.ru\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n',
        etag: '"first"',
        startsAt: new Date('2026-09-30T08:30:00.000Z'),
        endsAt: new Date('2026-09-30T10:00:00.000Z'),
      },
      {
        name: 'second.ics',
        uid: 'second@ical.ystuty.ru',
        content:
          'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:second@ical.ystuty.ru\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n',
        etag: '"second"',
        startsAt: new Date('2026-10-10T08:30:00.000Z'),
        endsAt: new Date('2026-10-10T10:00:00.000Z'),
      },
    ],
  };

  it('advertises each VEVENT as a separate calendar object resource', () => {
    const service = new CalDavService();
    const response = service.createCollectionPropfindResponse(
      '/v1/calendar/caldav/group-id/4627/calendar/',
      collection,
      '1',
      'urn:ystuty:caldav:sync:collection:state',
    );

    expect(response).toContain('<c:calendar-query/>');
    expect(response).toContain('<c:calendar-multiget/>');
    expect(response).toContain('<d:sync-collection/>');
    expect(response).toContain(
      '<d:sync-token>urn:ystuty:caldav:sync:collection:state</d:sync-token>',
    );
    expect(response).toContain('first.ics');
    expect(response).toContain('second.ics');
    expect(response).toContain('<d:getetag>"first"</d:getetag>');
    expect(response).toContain('<cs:getctag>');
    expect(response).toContain('<d:getlastmodified>');
  });

  it('honours explicitly requested PROPFIND properties', () => {
    const service = new CalDavService();
    const request = service.parsePropfindRequest(`
      <d:propfind xmlns:d="DAV:">
        <d:prop><d:getetag/><d:getlastmodified/><d:unknown-property/></d:prop>
      </d:propfind>
    `);
    const response = service.createCalendarResourcePropfindResponse(
      '/v1/calendar/caldav/group-id/4627/calendar/first.ics',
      collection.resources[0],
      request!,
    );

    expect(response).toContain('<d:getetag>"first"</d:getetag>');
    expect(response).toContain('<d:getlastmodified>');
    expect(response).not.toContain('<d:getcontenttype>');
    expect(response).toContain('<d:unknown-property/>');
    expect(response).toContain('HTTP/1.1 404 Not Found');
  });

  it('preserves the namespace of unsupported PROPFIND properties', () => {
    const service = new CalDavService();
    const request = service.parsePropfindRequest(`
      <d:propfind
        xmlns:d="DAV:"
        xmlns:c="urn:ietf:params:xml:ns:caldav"
        xmlns:cs="http://calendarserver.org/ns/"
        xmlns:apple="http://apple.com/ns/ical/">
        <d:prop>
          <c:calendar-home-set/>
          <cs:getctag/>
          <apple:calendar-color/>
          <d:owner/>
        </d:prop>
      </d:propfind>
    `)!;
    const response = service.createCollectionPropfindResponse(
      '/v1/calendar/caldav/group-id/4627/calendar/',
      collection,
      '0',
      'urn:ystuty:caldav:sync:collection:state',
      undefined,
      request,
    );

    expect(service.getPropfindPropertiesForLog(request)).toBe(
      'c:calendar-home-set,cs:getctag,apple:calendar-color,d:owner',
    );
    expect(response).toContain('<cs:getctag>');
    expect(response).toContain('<c:calendar-home-set/>');
    expect(response).toContain(
      '<x:calendar-color xmlns:x="http://apple.com/ns/ical/"/>',
    );
    expect(response).toContain('<d:owner/>');
    expect(response).not.toContain('<d:calendar-home-set/>');
    expect(response).not.toContain('<d:calendar-color/>');
  });

  it('provides a principal and calendar home for account-style discovery', () => {
    const service = new CalDavService();
    const principalResponse = service.createPrincipalPropfindResponse(
      '/caldav/principals/group-id/4627/',
      '/caldav/group-id/4627/',
    );
    const homeResponse = service.createCalendarHomePropfindResponse(
      '/caldav/group-id/4627/',
      '/caldav/group-id/4627/calendar/',
      collection,
      '1',
      'urn:ystuty:caldav:sync:collection:state',
      '/caldav/principals/group-id/4627/',
    );

    expect(principalResponse).toContain('<d:principal/>');
    expect(principalResponse).toContain('<c:calendar-home-set>');
    expect(principalResponse).toContain('/caldav/group-id/4627/');
    expect(homeResponse).toContain(
      '<d:resourcetype><d:collection/></d:resourcetype>',
    );
    expect(homeResponse).toContain('<c:calendar/>');
    expect(homeResponse).toContain('<d:current-user-principal>');
  });

  it('provides calendar-home-set directly on the URL entered by Bitrix24', () => {
    const service = new CalDavService();
    const request = service.parsePropfindRequest(`
      <A:propfind
        xmlns:A="DAV:"
        xmlns:A0="urn:ietf:params:xml:ns:caldav"
        xmlns:A1="http://calendarserver.org/ns/">
        <A:prop>
          <A0:calendar-home-set/>
          <A1:getctag/>
          <A:displayname/>
          <A:resourcetype/>
          <A:owner/>
          <A:current-user-principal/>
          <A:principal-URL/>
        </A:prop>
      </A:propfind>
    `)!;
    const response = service.createCalendarHomePropfindResponse(
      '/caldav/group-id/4627/',
      '/caldav/group-id/4627/calendar/',
      collection,
      '1',
      'urn:ystuty:caldav:sync:collection:state',
      '/caldav/principals/group-id/4627/',
      request,
    );

    expect(response).toContain(
      '<c:calendar-home-set><d:href>/caldav/group-id/4627/</d:href></c:calendar-home-set>',
    );
    expect(response).toContain(
      '<cs:getctag>urn:ystuty:caldav:sync:collection:state</cs:getctag>',
    );
    expect(response).toContain(
      '<d:principal-URL><d:href>/caldav/principals/group-id/4627/</d:href></d:principal-URL>',
    );
    expect(response).toContain(
      '<d:owner><d:href>/caldav/principals/group-id/4627/</d:href></d:owner>',
    );
    expect(response).not.toContain('<c:calendar-home-set/>');
    expect(response).not.toContain('<d:principal-URL/>');
  });

  it('filters calendar-query resources by time range and only includes requested data', () => {
    const service = new CalDavService();
    const report = service.parseReportRequest(`
      <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop><d:getetag/></d:prop>
        <c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="20260930T000000Z" end="20261001T000000Z"/></c:comp-filter></c:comp-filter></c:filter>
      </c:calendar-query>
    `);

    expect(report).toEqual(
      expect.objectContaining({
        type: 'calendar-query',
        includeCalendarData: false,
      }),
    );
    const reportResult = service.getReportResources(collection, report!, '1');
    expect(reportResult.resources.map((resource) => resource.name)).toEqual([
      'first.ics',
    ]);

    const response = service.createReportResponse(
      '/v1/calendar/caldav/group-id/4627/calendar/',
      reportResult,
      report!.includeCalendarData,
    );
    expect(response).toContain('first.ics');
    expect(response).not.toContain('second.ics');
    expect(response).not.toContain('<c:calendar-data>');
  });

  it('returns only hrefs requested by calendar-multiget', () => {
    const service = new CalDavService();
    const report = service.parseReportRequest(`
      <c:calendar-multiget xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop><d:getetag/><c:calendar-data/></d:prop>
        <d:href>/v1/calendar/caldav/group-id/4627/calendar/second.ics</d:href>
      </c:calendar-multiget>
    `);

    expect(report).toEqual(
      expect.objectContaining({
        type: 'calendar-multiget',
        includeCalendarData: true,
      }),
    );
    expect(
      service
        .getReportResources(collection, report!, undefined)
        .resources.map((resource) => resource.name),
    ).toEqual(['second.ics']);
  });

  it('returns a per-resource 404 from calendar-multiget for an unknown href', () => {
    const service = new CalDavService();
    const report = service.parseReportRequest(`
      <c:calendar-multiget xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop><d:getetag/></d:prop>
        <d:href>/v1/calendar/caldav/group-id/4627/calendar/missing.ics</d:href>
      </c:calendar-multiget>
    `)!;
    const reportResult = service.getReportResources(
      collection,
      report,
      undefined,
    );

    expect(reportResult.missingHrefs).toHaveLength(1);
    expect(
      service.createReportResponse(
        '/v1/calendar/caldav/group-id/4627/calendar/',
        reportResult,
        false,
      ),
    ).toContain('HTTP/1.1 404 Not Found');
  });

  it('parses sync-collection and includes the next sync-token in its response', () => {
    const service = new CalDavService();
    const report = service.parseReportRequest(`
      <d:sync-collection xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:sync-token/>
        <d:sync-level>1</d:sync-level>
        <d:prop><d:getetag/><c:calendar-data/></d:prop>
      </d:sync-collection>
    `);

    expect(report).toEqual({
      type: 'sync-collection',
      includeCalendarData: true,
      syncToken: null,
    });
    expect(
      service.createSyncCollectionResponse(
        '/v1/calendar/caldav/group-id/4627/calendar/',
        {
          isValid: true,
          token: 'urn:ystuty:caldav:sync:collection:state',
          resources: [collection.resources[0]],
          deletedResourceNames: ['removed.ics'],
        },
        true,
      ),
    ).toEqual(
      expect.stringContaining(
        '<d:sync-token>urn:ystuty:caldav:sync:collection:state</d:sync-token>',
      ),
    );
  });
});
