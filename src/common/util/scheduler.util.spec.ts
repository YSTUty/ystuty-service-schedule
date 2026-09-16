import { LessonFlags } from '@my-interfaces';

import { analyzeLessonType } from './scheduler.util';

describe('analyzeLessonType', () => {
  it('keeps a known lesson type while preserving extra source information', () => {
    expect(
      analyzeLessonType({
        lessonName: 'Администрирование информационных систем',
        lessonTypeShortName: 'лек.',
        additionalInfo: '(онлайн) Тензор',
      }),
    ).toEqual({
      lessonName: 'Администрирование информационных систем',
      subInfo: 'Тензор',
      type: LessonFlags.Lecture,
    });
  });

  it('marks an event without a recognized type as unsupported', () => {
    expect(
      analyzeLessonType({
        lessonName: 'Ученый совет',
        lessonTypeShortName: null,
        additionalInfo: null,
      }),
    ).toEqual({
      lessonName: 'Ученый совет',
      subInfo: undefined,
      type: LessonFlags.Unsupported,
    });
  });
});
