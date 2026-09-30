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
      '/v1/calendar/caldav/group-id/4627/',
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
      '/v1/calendar/caldav/group-id/4627/',
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
        <d:href>/v1/calendar/caldav/group-id/4627/second.ics</d:href>
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
        <d:href>/v1/calendar/caldav/group-id/4627/missing.ics</d:href>
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
        '/v1/calendar/caldav/group-id/4627/',
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
        '/v1/calendar/caldav/group-id/4627/',
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
