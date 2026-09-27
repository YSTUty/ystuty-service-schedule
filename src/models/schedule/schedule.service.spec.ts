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
  const groupRepository = {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
  };
  const createQueryBuilder = () => {
    const queryBuilder = {
      addOrderBy: jest.fn(),
      addSelect: jest.fn(),
      andWhere: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getRawMany: jest.fn(),
      innerJoin: jest.fn(),
      leftJoin: jest.fn(),
      orderBy: jest.fn(),
      select: jest.fn(),
      where: jest.fn(),
    };
    for (const method of Object.values(queryBuilder)) {
      if (
        method !== queryBuilder.getMany &&
        method !== queryBuilder.getOne &&
        method !== queryBuilder.getRawMany
      ) {
        method.mockReturnValue(queryBuilder);
      }
    }
    return queryBuilder;
  };

  const createService = () =>
    new ScheduleService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      scheduleSemesterRepository as any,
      groupRepository as any,
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

  it('returns the current trimmed group name for a persistent calendar link', async () => {
    const service = createService();
    groupRepository.findOneBy.mockResolvedValue({ name: ' ЦИС-26 ' });

    await expect(service.getGroupNameById(4627)).resolves.toBe('ЦИС-26');
    expect(groupRepository.findOneBy).toHaveBeenCalledWith({ id: 4627 });
  });

  it('looks up a persistent calendar group by its current name', async () => {
    const service = createService();
    jest.spyOn(service, 'getGroupNameById').mockResolvedValue('ЦИС-27');
    const getByGroup = jest.spyOn(service, 'getByGroup').mockResolvedValue({
      items: [],
    } as any);

    await expect(service.getByPersistentGroupId(5072200)).resolves.toEqual({
      items: [],
    });
    expect(getByGroup).toHaveBeenCalledWith('ЦИС-27');
  });

  it('does not query schedule rows when a persistent group is missing', async () => {
    const service = createService();
    jest.spyOn(service, 'getGroupNameById').mockResolvedValue(null);
    const getByGroup = jest.spyOn(service, 'getByGroup');

    await expect(service.getByPersistentGroupId(5072200)).resolves.toBeNull();
    expect(getByGroup).not.toHaveBeenCalled();
  });

  it('finds the persistent group ID by its name', async () => {
    const service = createService();
    const queryBuilder = createQueryBuilder();
    groupRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    queryBuilder.getOne.mockResolvedValue({ id: 4627, name: 'ЦИС-26' });

    await expect(service.getGroupIdByName(' ЦИС-26 ')).resolves.toEqual({
      groupId: 4627,
      groupName: 'ЦИС-26',
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(g.namegroup) = LOWER(:groupName)',
      { groupName: 'ЦИС-26' },
    );
  });

  it('looks up exams by group ID when the schedule request uses an ID', async () => {
    const scheduleQueryBuilder = createQueryBuilder();
    const examQueryBuilder = createQueryBuilder();
    scheduleQueryBuilder.getMany.mockResolvedValue([]);
    examQueryBuilder.getRawMany.mockResolvedValue([
      {
        date: new Date('2026-09-01T08:30:00.000Z'),
        lessonName: 'Экзамен',
        auditoryName: 'В-201',
        note: null,
      },
    ]);
    const service = new ScheduleService(
      {
        createQueryBuilder: jest.fn(() => scheduleQueryBuilder),
      } as any,
      {} as any,
      {
        createQueryBuilder: jest.fn(() => examQueryBuilder),
      } as any,
      {} as any,
      {} as any,
      scheduleSemesterRepository as any,
      {} as any,
      { redis } as any,
    );
    (service as any).allowCaching = false;

    await expect(service.getByGroup(4627)).resolves.toEqual(
      expect.objectContaining({
        items: expect.any(Array),
      }),
    );

    expect(scheduleQueryBuilder.andWhere).toHaveBeenCalledWith('idgr = :id', {
      id: 4627,
    });
    expect(examQueryBuilder.andWhere).toHaveBeenCalledWith(
      'e.idgroup = :groupId',
      { groupId: 4627 },
    );
    expect(examQueryBuilder.andWhere).not.toHaveBeenCalledWith(
      'LOWER(g.namegroup) = LOWER(:namegroup)',
      expect.anything(),
    );
  });
});
