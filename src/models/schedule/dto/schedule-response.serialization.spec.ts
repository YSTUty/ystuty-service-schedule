import { instanceToPlain, plainToInstance } from 'class-transformer';

import { LessonFlags, WeekNumberType, WeekParityType } from '@my-interfaces';

import {
  ActualGroupsResponseDto,
  AudienceDto,
  ScheduleItemsResponseDto,
} from './schedule-response.dto';

const serialize = <T>(type: new () => T, input: object) =>
  JSON.parse(
    JSON.stringify(
      instanceToPlain(
        plainToInstance(type, input, {
          excludeExtraneousValues: true,
        }),
        {
          excludeExtraneousValues: true,
        },
      ),
    ),
  );

describe('Schedule response DTO serialization', () => {
  it('keeps the documented schedule fields and excludes implementation fields', () => {
    const result = serialize(ScheduleItemsResponseDto, {
      isCache: true,
      cache: {
        isCached: true,
        ttlSeconds: 120,
        internalCacheKey: 'byGroup:0:цис-37',
      },
      items: [
        {
          number: 1,
          days: [
            {
              info: {
                type: WeekNumberType.Monday,
                date: new Date('2026-09-07T00:00:00.000Z'),
                weekNumber: 1,
                sourceTimezone: 'Europe/Moscow',
              },
              lessons: [
                {
                  trainingId: 123456,
                  number: 1,
                  timeRange: '08:30-10:00',
                  originalTimeTitle: '1. 08:30-10:00',
                  parity: WeekParityType.ODD,
                  type: LessonFlags.Lecture,
                  isStream: false,
                  duration: 2,
                  durationMinutes: 90,
                  isDivision: false,
                  hiddenSourceField: 'must not be returned',
                },
              ],
              extra: true,
            },
          ],
          sourceWeek: 1,
        },
      ],
      unexpected: true,
    });

    expect(result).toEqual({
      isCache: true,
      cache: {
        isCached: true,
        ttlSeconds: 120,
      },
      items: [
        {
          number: 1,
          days: [
            {
              info: {
                type: WeekNumberType.Monday,
                date: '2026-09-07T00:00:00.000Z',
                weekNumber: 1,
              },
              lessons: [
                {
                  number: 1,
                  timeRange: '08:30-10:00',
                  originalTimeTitle: '1. 08:30-10:00',
                  parity: WeekParityType.ODD,
                  type: LessonFlags.Lecture,
                  isStream: false,
                  duration: 2,
                  durationMinutes: 90,
                  isDivision: false,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('preserves string and detailed group variants', () => {
    const result = serialize(ActualGroupsResponseDto, {
      isCache: false,
      cache: { isCached: false, ttlSeconds: null },
      name: '2026/2027 Осенний семестр',
      items: [
        {
          id: 53,
          name: 'Институт цифровых систем',
          groups: [
            'ЦИС-37',
            {
              course: 3,
              name: 'ЦИС-38',
              id_schedule: 4627,
              groupId: 4627,
              hasLecture: true,
              scheduleName: '2026/2027 Осенний семестр',
              sourceId: 1,
            },
          ],
        },
      ],
    });

    expect(result.items[0].groups).toEqual([
      'ЦИС-37',
      {
        course: 3,
        name: 'ЦИС-38',
        id_schedule: 4627,
        groupId: 4627,
        hasLecture: true,
        scheduleName: '2026/2027 Осенний семестр',
      },
    ]);
  });

  it('does not expose relations from the auditory entity', () => {
    const result = serialize(AudienceDto, {
      id: 601,
      name: 'В-201',
      buildingName: 'В',
      department: { id: 5, name: 'Кафедра' },
      exams: [{ id: 1 }],
    });

    expect(result).toEqual({
      id: 601,
      name: 'В-201',
      buildingName: 'В',
    });
  });
});
