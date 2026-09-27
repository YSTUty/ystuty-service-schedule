import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  it('uses the persistent group lookup for a group-id calendar link', async () => {
    const scheduleService = {
      getByGroup: jest.fn(),
      getByPersistentGroupId: jest.fn().mockResolvedValue(null),
      getGroupNameById: jest.fn(),
    };
    const service = new CalendarService(scheduleService as any);

    await expect(
      service.generateCalendarForGroupId(5072200),
    ).resolves.toBeNull();

    expect(scheduleService.getByPersistentGroupId).toHaveBeenCalledWith(
      5072200,
    );
    expect(scheduleService.getByGroup).not.toHaveBeenCalled();
  });
});
