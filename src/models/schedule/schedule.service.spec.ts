import { Logger } from '@nestjs/common';

import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    ttl: jest.fn(),
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
    redis.ttl.mockResolvedValue(-2);
    redis.set.mockRejectedValue(new Error('Redis is unavailable'));
    jest.spyOn(service, 'getGroups').mockResolvedValue({
      isCache: false,
      items: [{ groups: ['ИВТ-21'] }],
    } as any);

    await expect(service.getCount('group')).resolves.toEqual({
      isCache: false,
      cache: {
        isCached: false,
        ttlSeconds: null,
      },
      count: 1,
    });
    expect(redis.set).toHaveBeenCalledWith(
      'count:0:group',
      JSON.stringify({ count: 1 }),
      'EX',
      60 * 10,
    );
    expect(loggerError).toHaveBeenCalledWith(
      'Redis cache write failed: Redis is unavailable',
      expect.any(String),
    );
  });

  it('returns the remaining TTL when data is served from Redis cache', async () => {
    const service = createService();
    redis.get.mockResolvedValue(JSON.stringify({ count: 42 }));
    redis.ttl.mockResolvedValue(417);

    await expect(service.getCount('group')).resolves.toEqual({
      isCache: true,
      cache: {
        isCached: true,
        ttlSeconds: 417,
      },
      count: 42,
    });
  });
});
