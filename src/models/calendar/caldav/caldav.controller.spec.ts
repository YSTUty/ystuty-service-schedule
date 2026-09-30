import { CalDavController } from './caldav.controller';
import { CalDavService } from './caldav.service';
import { CalDavCalendarCollection } from './caldav.types';

describe('CalDavController', () => {
  const collection: CalDavCalendarCollection = {
    name: 'ЦИС-26',
    description: 'Расписание занятий ЯГТУ для группы ЦИС-26',
    resources: [
      {
        name: 'lesson-1.ics',
        uid: 'lesson-1@ical.ystuty.ru',
        content:
          'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:lesson-1@ical.ystuty.ru\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n',
        etag: '"lesson-1"',
        startsAt: new Date('2026-10-01T08:30:00.000Z'),
        endsAt: new Date('2026-10-01T10:00:00.000Z'),
      },
    ],
  };

  const createResponse = () => {
    const response = {
      end: jest.fn(),
      send: jest.fn(),
      set: jest.fn(),
      status: jest.fn(),
      type: jest.fn(),
    };
    response.status.mockReturnValue(response);
    response.set.mockReturnValue(response);
    response.type.mockReturnValue(response);
    return response;
  };

  const createController = () => {
    const calendarService = {
      generateCalDavCalendarForGroup: jest.fn().mockResolvedValue(collection),
      generateCalDavCalendarForGroupId: jest.fn().mockResolvedValue(collection),
      generateCalDavCalendarForTeacher: jest.fn().mockResolvedValue(collection),
    };
    const stopTimer = jest.fn();
    const metricsService = {
      startCalendarRequestTimer: jest.fn(() => stopTimer),
    };
    return {
      calendarService,
      metricsService,
      stopTimer,
      controller: new CalDavController(
        calendarService as any,
        new CalDavService(),
        metricsService as any,
      ),
    };
  };

  it('returns matching CalDAV resources for a calendar-query REPORT', async () => {
    const { controller, metricsService, stopTimer } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn((name: string) => (name === 'Depth' ? '1' : undefined)),
      method: 'REPORT',
      originalUrl: '/v1/calendar/caldav/group/%D0%A6%D0%98%D0%A1-16',
    };
    const body = `
      <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop><d:getetag/><c:calendar-data/></d:prop>
        <c:filter><c:comp-filter name="VCALENDAR"/></c:filter>
      </c:calendar-query>
    `;

    await controller.handleGroupRequest(
      'ЦИС-16',
      undefined,
      request as any,
      response as any,
      body,
    );

    expect(response.status).toHaveBeenCalledWith(207);
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('lesson-1.ics'),
    );
    expect(metricsService.startCalendarRequestTimer).toHaveBeenCalledWith({
      protocol: 'caldav',
      targetType: 'group',
      target: 'ЦИС-16',
      method: 'REPORT',
    });
    expect(stopTimer).toHaveBeenCalledWith('success');
  });

  it('answers a Depth: 1 CalDAV discovery request with event resources', async () => {
    const { controller } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn((name: string) => (name === 'Depth' ? '1' : undefined)),
      method: 'PROPFIND',
      originalUrl: '/v1/calendar/caldav/group-id/4627',
    };

    await controller.handleGroupIdRequest(
      4627,
      undefined,
      request as any,
      response as any,
      undefined,
    );

    expect(response.status).toHaveBeenCalledWith(207);
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('<c:calendar-query/>'),
    );
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('lesson-1.ics'),
    );
  });

  it('returns properties for an individual calendar object resource', async () => {
    const { controller } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'PROPFIND',
      originalUrl: '/v1/calendar/caldav/group-id/4627/lesson-1.ics',
    };

    await controller.handleGroupIdRequest(
      4627,
      'lesson-1.ics',
      request as any,
      response as any,
      undefined,
    );

    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining(
        '<d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype>',
      ),
    );
    expect(response.send).toHaveBeenCalledWith(
      expect.not.stringContaining('<d:collection/>'),
    );
  });

  it('returns a persistent group calendar object resource through CalDAV', async () => {
    const { controller, calendarService, metricsService, stopTimer } =
      createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'GET',
      originalUrl: '/v1/calendar/caldav/group-id/4627/lesson-1.ics',
    };

    await controller.handleGroupIdRequest(
      4627,
      'lesson-1.ics',
      request as any,
      response as any,
      undefined,
    );

    expect(
      calendarService.generateCalDavCalendarForGroupId,
    ).toHaveBeenCalledWith(4627);
    expect(metricsService.startCalendarRequestTimer).toHaveBeenCalledWith({
      protocol: 'caldav',
      targetType: 'group',
      target: 4627,
      method: 'GET',
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(stopTimer).toHaveBeenCalledWith('success');
  });

  it('rejects write methods', async () => {
    const { controller } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'PUT',
      originalUrl:
        '/v1/calendar/caldav/group/%D0%A6%D0%98%D0%A1-16/lesson-1.ics',
    };

    await controller.handleGroupRequest(
      'ЦИС-16',
      'lesson-1.ics',
      request as any,
      response as any,
      undefined,
    );

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.set).toHaveBeenCalledWith(
      'Allow',
      'OPTIONS, PROPFIND, REPORT, GET, HEAD',
    );
  });

  it('returns a teacher calendar resource through CalDAV', async () => {
    const { controller, calendarService, metricsService, stopTimer } =
      createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'GET',
      originalUrl: '/v1/calendar/caldav/teacher/42/lesson-1.ics',
    };

    await controller.handleTeacherRequest(
      42,
      'lesson-1.ics',
      request as any,
      response as any,
      undefined,
    );

    expect(
      calendarService.generateCalDavCalendarForTeacher,
    ).toHaveBeenCalledWith(42);
    expect(metricsService.startCalendarRequestTimer).toHaveBeenCalledWith({
      protocol: 'caldav',
      targetType: 'teacher',
      target: 42,
      method: 'GET',
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(stopTimer).toHaveBeenCalledWith('success');
  });
});
