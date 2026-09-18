import { NotFoundException } from '@nestjs/common';

import { CalendarController } from './calendar.controller';

describe('CalendarController', () => {
  const createResponse = () => ({
    end: jest.fn(),
    writeHead: jest.fn(),
  });

  const createController = () => {
    const calendarService = {
      generateCalenadrForGroup: jest.fn().mockResolvedValue({
        toString: () => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
      }),
      generateCalenadrForTeacher: jest.fn(),
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

  it('records a missing group without treating it as a successful download', async () => {
    const { controller, calendarService, stopTimer } = createController();
    const response = createResponse();
    calendarService.generateCalenadrForGroup.mockResolvedValue(null);

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
