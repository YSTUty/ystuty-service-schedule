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
      type: LessonFlags.Lecture | LessonFlags.External | LessonFlags.Tenzor,
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

  it.each([
    [
      'library issue',
      {
        lessonName: 'Книговыдача (Библиотека, корпус В)',
        additionalInfo: '',
      },
      LessonFlags.Library,
    ],
    [
      'research seminar',
      {
        lessonName: 'Научно-исследовательский семинар (Ист)',
        additionalInfo: '',
      },
      LessonFlags.ResearchWork,
    ],
    [
      'military training',
      { lessonName: null, additionalInfo: 'ВУЦ' },
      LessonFlags.MilitaryTraining,
    ],
    [
      'practice',
      { lessonName: null, additionalInfo: 'Производств. прак' },
      LessonFlags.Practice,
    ],
    [
      'physical training',
      { lessonName: 'Прикладная физическая культура', additionalInfo: '' },
      LessonFlags.PhysicalTraining,
    ],
    [
      'physical culture and sport',
      { lessonName: 'Физическая культура и спорт', additionalInfo: '' },
      LessonFlags.PhysicalTraining,
    ],
    [
      'short physical training name',
      { lessonName: 'физ-ра', additionalInfo: '' },
      LessonFlags.PhysicalTraining,
    ],
    [
      'physical training without hyphen',
      { lessonName: 'Физра', additionalInfo: '' },
      LessonFlags.PhysicalTraining,
    ],
    [
      'physical training informal name',
      { lessonName: 'Физкультура', additionalInfo: '' },
      LessonFlags.PhysicalTraining,
    ],
    [
      'elective',
      { lessonName: 'Физика', additionalInfo: 'факультатив' },
      LessonFlags.Elective,
    ],
    [
      'event',
      { lessonName: null, additionalInfo: 'Встреча с директором' },
      LessonFlags.Event,
    ],
    [
      'organizational meeting',
      { lessonName: null, additionalInfo: 'Собрание 1 курса ИЦС' },
      LessonFlags.OrganizationalMeeting,
    ],
    [
      'student research club',
      { lessonName: null, additionalInfo: 'кружок СНО' },
      LessonFlags.Event,
    ],
    [
      'MIPT training event',
      { lessonName: null, additionalInfo: 'ТРЕНИНГИ МФТИ' },
      LessonFlags.Event,
    ],
    [
      'Tenzor external lesson',
      {
        lessonName: 'Конструирование программного обеспечения',
        additionalInfo: 'ТЕНЗОР',
      },
      LessonFlags.External | LessonFlags.Tenzor,
    ],
    [
      'School 21 external lesson',
      {
        lessonName: 'Алгоритмизация и программирование',
        additionalInfo: 'школа 21',
      },
      LessonFlags.External | LessonFlags.School21,
    ],
  ])('classifies untyped %s from the verified dump', (_name, input, type) => {
    expect(analyzeLessonType(input)).toMatchObject({ type });
  });
});
