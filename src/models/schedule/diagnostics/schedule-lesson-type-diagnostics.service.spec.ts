import { ScheduleLessonTypeDiagnosticsService } from './schedule-lesson-type-diagnostics.service';

describe('ScheduleLessonTypeDiagnosticsService', () => {
  const queryBuilder = {
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    groupBy: jest.fn(),
    addGroupBy: jest.fn(),
    getRawMany: jest.fn(),
  };
  const scheduleViewRepository = {
    createQueryBuilder: jest.fn(),
  };

  const createService = () =>
    new ScheduleLessonTypeDiagnosticsService(scheduleViewRepository as any);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-17T12:00:00.000Z'));
    jest.clearAllMocks();
    for (const method of [
      queryBuilder.innerJoin,
      queryBuilder.leftJoin,
      queryBuilder.select,
      queryBuilder.addSelect,
      queryBuilder.where,
      queryBuilder.andWhere,
      queryBuilder.groupBy,
      queryBuilder.addGroupBy,
    ]) {
      method.mockReturnValue(queryBuilder);
    }
    scheduleViewRepository.createQueryBuilder.mockReturnValue(queryBuilder);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('aggregates untyped formats and keeps one exact source sample', async () => {
    queryBuilder.getRawMany
      .mockResolvedValueOnce([
        {
          occurrences: 1,
          groupsCount: 1,
          sampleEntryId: 1,
          lessonName: 'Администрирование информационных систем (ИСТ)',
          lessonTypeName: null,
          lessonTypeShortName: null,
          additionalInfo: 'Тензор',
        },
        {
          occurrences: 1,
          groupsCount: 1,
          sampleEntryId: 2,
          lessonName: null,
          lessonTypeName: null,
          lessonTypeShortName: null,
          additionalInfo: 'Ученый совет',
        },
      ])
      .mockResolvedValueOnce([
        {
          scheduleEntryId: 1,
          semesterId: 123,
          groupId: 1,
          groupName: 'ЦИС-36',
          instituteId: 10,
          instituteName: 'Институт цифровых систем',
          lessonName: 'Администрирование информационных систем (ИСТ)',
          lessonTypeName: null,
          lessonTypeShortName: null,
          additionalInfo: 'Тензор',
          startsAt: new Date('2026-09-01T08:30:00.000Z'),
          timeRange: '08:30-10:00',
          isDistant: 1,
          teacherName: 'Иванов И.И.',
          auditoryName: null,
        },
        {
          scheduleEntryId: 2,
          semesterId: 123,
          groupId: 2,
          groupName: 'Ученый совет',
          instituteId: 99,
          instituteName: 'Служебный институт',
          lessonName: null,
          lessonTypeName: null,
          lessonTypeShortName: null,
          additionalInfo: 'Ученый совет',
          startsAt: new Date('2026-09-02T08:30:00.000Z'),
          timeRange: '08:30-10:00',
          isDistant: 0,
          teacherName: null,
          auditoryName: 'А-101',
        },
      ]);

    const result = await createService().getLessonTypeReport();

    expect(result.summary).toEqual({
      untypedRows: 2,
      untypedFormats: 2,
      unsupportedRows: 1,
      unsupportedFormats: 1,
    });
    expect(result.year).toBe(2026);
    expect(result.dateRange).toEqual({
      from: '2026-01-01',
      to: '2027-01-01',
    });
    expect(result.formats).toEqual([
      expect.objectContaining({
        normalized: expect.objectContaining({
          lessonName: 'Ученый совет',
          isUnsupported: true,
        }),
      }),
    ]);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('n.fl_pub > 0');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'r.datz >= :yearStart AND r.datz < :nextYearStart',
      {
        yearStart: '2026-01-01',
        nextYearStart: '2027-01-01',
      },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "(r.abrwz IS NULL OR LTRIM(RTRIM(r.abrwz)) = '')",
    );
  });
});
