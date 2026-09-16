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
    };
    return {
      calendarService,
      controller: new CalDavController(
        calendarService as any,
        new CalDavService(),
      ),
    };
  };

  it('returns calendar data for a CalDAV REPORT', async () => {
    const { controller } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'REPORT',
      originalUrl: '/v1/calendar/caldav/%D0%A6%D0%98%D0%A1-16',
    };

    await controller.handleRequest(
      'ЦИС-16',
      undefined,
      request as any,
      response as any,
    );

    expect(response.status).toHaveBeenCalledWith(207);
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('BEGIN:VCALENDAR'),
    );
  });

  it('rejects write methods', async () => {
    const { controller } = createController();
    const response = createResponse();
    const request = {
      header: jest.fn(),
      method: 'PUT',
      originalUrl: '/v1/calendar/caldav/%D0%A6%D0%98%D0%A1-16/calendar.ics',
    };

    await controller.handleRequest(
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
});
