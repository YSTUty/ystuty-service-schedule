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

  it('creates deterministic single-event CalDAV resources without METHOD', async () => {
    const lesson = {
      calendarResourceKey: 'schedule:123',
      endAt: '2026-10-01T07:00:00.000Z',
      isDistant: false,
      lessonName: 'Программирование',
      startAt: '2026-10-01T05:30:00.000Z',
      type: 1,
    };
    const scheduleService = {
      getByGroup: jest.fn().mockResolvedValue({
        items: [{ days: [{ lessons: [lesson] }] }],
      }),
    };
    const service = new CalendarService(scheduleService as any);

    const first = await service.generateCalDavCalendarForGroup('ЦИС-27');
    const second = await service.generateCalDavCalendarForGroup('ЦИС-27');
    const resource = first!.resources[0];

    expect(first!.resources).toHaveLength(1);
    expect(resource.name).toMatch(/^[a-f0-9]{64}\.ics$/);
    expect(resource.content).toContain('BEGIN:VEVENT');
    expect(resource.content).not.toContain('METHOD:PUBLISH');
    expect(resource.content).toContain('DTSTART:20261001T053000Z');
    expect(resource.etag).toBe(second!.resources[0].etag);
    expect(resource.uid).toBe(second!.resources[0].uid);
  });
});
