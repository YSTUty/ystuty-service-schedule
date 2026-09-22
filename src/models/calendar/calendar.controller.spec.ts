import { NotFoundException } from '@nestjs/common';

import { CalendarController } from './calendar.controller';

describe('CalendarController', () => {
  const createResponse = () => ({
    end: jest.fn(),
    writeHead: jest.fn(),
  });

  const createController = () => {
    const calendarService = {
      generateCalendarForGroup: jest.fn().mockResolvedValue({
        toString: () => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
      }),
      generateCalendarForGroupId: jest.fn().mockResolvedValue({
        toString: () => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
      }),
      generateCalendarForTeacher: jest.fn(),
    };
    const stopTimer = jest.fn();
    const metricsService = {
      startCalendarRequestTimer: jest.fn(() => stopTimer),
    };

    return {
      calendarService,
      metricsService,
      stopTimer,
      controller: new CalendarController(
        calendarService as any,
        metricsService as any,
      ),
    };
  };

  it('records a successful group iCalendar download', async () => {
    const { controller, metricsService, stopTimer } = createController();
    const response = createResponse();

    await controller.forGroup(
      'ЦИС-33',
      { headers: { 'user-agent': 'Jest' } } as any,
      response as any,
      '127.0.0.1',
    );

    expect(metricsService.startCalendarRequestTimer).toHaveBeenCalledWith({
      protocol: 'ical',
      targetType: 'group',
      target: 'ЦИС-33',
      method: 'GET',
    });
    expect(stopTimer).toHaveBeenCalledWith('success');
  });

  it('records a successful persistent group iCalendar download', async () => {
    const { controller, calendarService, metricsService, stopTimer } =
      createController();
    const response = createResponse();

    await controller.forGroupId(
      4627,
      { headers: { 'user-agent': 'Jest' } } as any,
      response as any,
      '127.0.0.1',
    );

    expect(calendarService.generateCalendarForGroupId).toHaveBeenCalledWith(
      4627,
    );
    expect(metricsService.startCalendarRequestTimer).toHaveBeenCalledWith({
      protocol: 'ical',
      targetType: 'group',
      target: 4627,
      method: 'GET',
    });
    expect(response.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        'Content-Disposition': 'attachment; filename="group-4627.ics"',
      }),
    );
    expect(stopTimer).toHaveBeenCalledWith('success');
  });

  it('records a missing group without treating it as a successful download', async () => {
    const { controller, calendarService, stopTimer } = createController();
    const response = createResponse();
    calendarService.generateCalendarForGroup.mockResolvedValue(null);

    await expect(
      controller.forGroup(
        'UNKNOWN',
        { headers: {} } as any,
        response as any,
        '127.0.0.1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(stopTimer).toHaveBeenCalledWith('not_found');
    expect(response.end).not.toHaveBeenCalled();
  });
});
