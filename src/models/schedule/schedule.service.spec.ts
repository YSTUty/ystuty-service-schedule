import { Logger } from '@nestjs/common';

import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const createService = () =>
    new ScheduleService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { redis } as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns data when writing the optional Redis cache fails', async () => {
    const service = createService();
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    redis.get.mockResolvedValue(null);
    redis.set.mockRejectedValue(new Error('Redis is unavailable'));
    jest.spyOn(service, 'getGroups').mockResolvedValue({
      isCache: false,
      items: [{ groups: ['ИВТ-21'] }],
    } as any);

    await expect(service.getCount('group')).resolves.toEqual({
      isCache: false,
      count: 1,
    });
    expect(redis.set).toHaveBeenCalledWith(
      'count:0:group',
      JSON.stringify({ isCache: false, count: 1 }),
      'EX',
      60 * 10,
    );
    expect(loggerError).toHaveBeenCalledWith(
      'Redis cache write failed: Redis is unavailable',
      expect.any(String),
    );
  });
});
