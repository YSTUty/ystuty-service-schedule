import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ScheduleController } from './schedule.controller';

describe('ScheduleController', () => {
  const scheduleService = {
    getByGroup: jest.fn(),
    resolvePublicSemesterId: jest.fn(),
  };

  const createController = () => new ScheduleController(scheduleService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the legacy idschedule alias for an explicitly selected semester', async () => {
    const controller = createController();
    const response = { items: [] };
    scheduleService.resolvePublicSemesterId.mockResolvedValue(123);
    scheduleService.getByGroup.mockResolvedValue(response);

    await expect(
      controller.getByGroup('ЦИС-37', { idschedule: 123 }),
    ).resolves.toBe(response);

    expect(scheduleService.resolvePublicSemesterId).toHaveBeenCalledWith(123);
    expect(scheduleService.getByGroup).toHaveBeenCalledWith('ЦИС-37', 123);
  });

  it('rejects conflicting semester query parameters', async () => {
    const controller = createController();

    await expect(
      controller.getByGroup('ЦИС-37', {
        semesterId: 123,
        idschedule: 456,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(scheduleService.resolvePublicSemesterId).not.toHaveBeenCalled();
  });

  it('rejects an explicitly selected unpublished semester', async () => {
    const controller = createController();
    scheduleService.resolvePublicSemesterId.mockResolvedValue(null);

    await expect(
      controller.getByGroup('ЦИС-37', { semesterId: 123 }),
    ).rejects.toThrow(NotFoundException);
    expect(scheduleService.getByGroup).not.toHaveBeenCalled();
  });
});
