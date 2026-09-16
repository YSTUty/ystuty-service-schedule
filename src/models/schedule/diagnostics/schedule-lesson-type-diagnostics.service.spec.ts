import { LessonFlags } from '@my-interfaces';

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
      unsupportedRows: 2,
      unsupportedFormats: 2,
    });
    expect(result.formats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          raw: {
            lessonName: 'Администрирование информационных систем (ИСТ)',
            lessonTypeName: null,
            lessonTypeShortName: null,
            additionalInfo: 'Тензор',
          },
          normalized: expect.objectContaining({
            flags: LessonFlags.Unsupported,
            labels: ['N/A'],
            isUnsupported: true,
          }),
          groupsCount: 1,
          sample: expect.objectContaining({
            semesterId: 123,
            group: { id: 1, name: 'ЦИС-36' },
            institute: { id: 10, name: 'Институт цифровых систем' },
            isDistant: true,
          }),
        }),
        expect.objectContaining({
          normalized: expect.objectContaining({
            lessonName: 'Ученый совет',
            isUnsupported: true,
          }),
        }),
      ]),
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('n.fl_pub > 0');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "(r.abrwz IS NULL OR LTRIM(RTRIM(r.abrwz)) = '')",
    );
  });
});
