import { CalDavController } from './caldav.controller';
import { CalDavService } from './caldav.service';

describe('CalDavController', () => {
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
      generateCalenadrForGroup: jest.fn().mockResolvedValue({
        toString: () => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
      }),
      generateCalenadrForTeacher: jest.fn().mockResolvedValue({
        toString: () => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
      }),
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

  it('returns calendar data for a CalDAV REPORT', async () => {
    const { controller, metricsService, stopTimer } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'REPORT',
      originalUrl: '/v1/calendar/caldav/%D0%A6%D0%98%D0%A1-16',
    };

    await controller.handleGroupRequest(
      'ЦИС-16',
      undefined,
      request as any,
      response as any,
    );

    expect(response.status).toHaveBeenCalledWith(207);
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('BEGIN:VCALENDAR'),
    );
    expect(metricsService.startCalendarRequestTimer).toHaveBeenCalledWith({
      protocol: 'caldav',
      targetType: 'group',
      target: 'ЦИС-16',
      method: 'REPORT',
    });
    expect(stopTimer).toHaveBeenCalledWith('success');
  });

  it('rejects write methods', async () => {
    const { controller } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'PUT',
      originalUrl: '/v1/calendar/caldav/%D0%A6%D0%98%D0%A1-16/calendar.ics',
    };

    await controller.handleGroupRequest(
      'ЦИС-16',
      'calendar.ics',
      request as any,
      response as any,
    );

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.set).toHaveBeenCalledWith(
      'Allow',
      'OPTIONS, PROPFIND, REPORT, GET, HEAD',
    );
  });

  it('returns a teacher calendar through CalDAV', async () => {
    const { controller, calendarService, metricsService, stopTimer } =
      createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'GET',
      originalUrl: '/v1/calendar/caldav/teacher/42/calendar.ics',
    };

    await controller.handleTeacherRequest(
      42,
      'calendar.ics',
      request as any,
      response as any,
    );

    expect(calendarService.generateCalenadrForTeacher).toHaveBeenCalledWith(42);
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
