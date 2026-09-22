import { NotFoundException } from '@nestjs/common';

import { ScheduleDiagnosticsController } from './schedule-diagnostics.controller';

describe('ScheduleDiagnosticsController', () => {
  const createController = () => {
    const scheduleService = {
      getGroupIdByName: jest.fn(),
    };

    return {
      scheduleService,
      controller: new ScheduleDiagnosticsController(
        {} as any,
        scheduleService as any,
      ),
    };
  };

  it('returns a group ID for testing a persistent calendar link', async () => {
    const { controller, scheduleService } = createController();
    scheduleService.getGroupIdByName.mockResolvedValue({
      groupId: 4627,
      groupName: 'ЦИС-26',
    });

    await expect(controller.getGroupId('ЦИС-26')).resolves.toEqual({
      groupId: 4627,
      groupName: 'ЦИС-26',
    });
    expect(scheduleService.getGroupIdByName).toHaveBeenCalledWith('ЦИС-26');
  });

  it('returns not found for an unknown group name', async () => {
    const { controller, scheduleService } = createController();
    scheduleService.getGroupIdByName.mockResolvedValue(null);

    await expect(controller.getGroupId('UNKNOWN')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
