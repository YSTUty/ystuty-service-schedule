import { Logger } from '@nestjs/common';

import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    ttl: jest.fn(),
  };
  const scheduleSemesterRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
  };

  const createService = () =>
    new ScheduleService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      scheduleSemesterRepository as any,
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

  it('accepts only published explicitly selected semesters', async () => {
    const service = createService();
    scheduleSemesterRepository.findOneBy.mockResolvedValue({ id: 123 });

    await expect(service.resolvePublicSemesterId(123)).resolves.toBe(123);
    await expect(service.resolvePublicSemesterId(0)).resolves.toBe(0);

    expect(scheduleSemesterRepository.findOneBy).toHaveBeenCalledWith({
      id: 123,
      fl_pub: 1,
    });
    expect(scheduleSemesterRepository.findOneBy).toHaveBeenCalledTimes(1);
  });

  it('hides unpublished semesters from the public semester list', async () => {
    const service = createService();
    const startsAt = new Date('2025-09-01T00:00:00.000Z');
    const endsAt = new Date('2025-12-31T00:00:00.000Z');
    scheduleSemesterRepository.find.mockResolvedValue([
      {
        id: 123,
        academicYearId: 2025,
        academicYear: { name: '2025/2026' },
        semesterNameId: 1,
        semesterName: { nameperr: 'Осенний семестр', sem: 1 },
        nned_data0: startsAt,
        nned_data1: endsAt,
        fl_pub: 1,
      },
    ]);

    await expect(service.getScheduleSemesters()).resolves.toEqual([
      {
        id: 123,
        academicYear: { id: 2025, name: '2025/2026' },
        semester: { id: 1, name: 'Осенний семестр', number: 1 },
        startsAt,
        endsAt,
        isPublished: true,
      },
    ]);
    expect(scheduleSemesterRepository.find).toHaveBeenCalledWith({
      where: { fl_pub: 1 },
      relations: ['semesterName', 'academicYear'],
      order: {
        academicYearId: 'DESC',
        semesterNameId: 'ASC',
        id: 'DESC',
      },
    });
  });
});
