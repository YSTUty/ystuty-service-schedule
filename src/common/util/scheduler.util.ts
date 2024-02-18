import { LessonFlags } from '@my-interfaces';

export const getLessonTypeStrArr = (type: LessonFlags) => {
  const types: string[] = [];
  if (type & LessonFlags.Lecture) types.push('Лек');
  if (type & LessonFlags.Practical) types.push('ПР');
  if (type & LessonFlags.Labaratory) types.push('ЛР');
  if (type & LessonFlags.CourseProject) types.push('КП');
  if (type & LessonFlags.Consultation) types.push('Консультация');
  if (type & LessonFlags.DifferentiatedTest) types.push('ДИФ.ЗАЧ');
  if (type & LessonFlags.Test) types.push('ЗАЧ');
  if (type & LessonFlags.Exam) types.push('ЭКЗ');
  if (type & LessonFlags.Library) types.push('Библиотека');
  if (type & LessonFlags.ResearchWork) types.push('НИР');
  if (type & LessonFlags.OrganizationalMeeting) types.push('Орг. собрание');
  if (type & LessonFlags.Unsupported) types.push('N/A');
  if (type & LessonFlags.None) types.push('???');
  return types;
};

export const getLessonTypeFromStr = (type: string): LessonFlags => {
  type = type.toLowerCase();
  return type.includes('пр' /* 'пр.з' */)
    ? LessonFlags.Practical
    : type.includes('лек')
      ? LessonFlags.Lecture
      : type.includes('лаб')
        ? LessonFlags.Labaratory
        : type.includes('кп')
          ? LessonFlags.CourseProject
          : type.includes('конс')
            ? LessonFlags.Consultation
            : type.includes('диф')
              ? LessonFlags.DifferentiatedTest
              : type.includes('зач')
                ? LessonFlags.Test
                : type.includes('экз')
                  ? LessonFlags.Exam
                  : LessonFlags.Unsupported;
};

export const getWeekNumber = (date: Date = new Date()) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();

  const weekNo = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);

  return weekNo;
};

export const getWeekOffsetByYear = (currentDate: Date = new Date()) => {
  const currentYear = currentDate.getFullYear();
  const currentWeek = getWeekNumber(currentDate);

  // TODO?: надо ли учитывать (подкрутить день/два), если выходит выходной день?
  const firstSeptemberDate = new Date(currentYear, 8, 1);
  const firstSeptemberWeek = getWeekNumber(firstSeptemberDate);

  // Если текущая неделя больше первой недели сентября
  if (currentWeek > firstSeptemberWeek - 1) {
    return firstSeptemberWeek - 1;
  }

  const firstFebruaryDate = new Date(currentYear, 1, 1);
  // TODO?: надо ли учитывать (подкрутить день/два), если выходит выходной день?
  const firstFebruaryWeek = getWeekNumber(firstFebruaryDate);
  // Если текущая неделя меньше первой недели февраля (значит фиксим прошлогоднюю неделю)
  if (currentWeek < firstFebruaryWeek) {
    const prevYear = currentYear - 1;
    // TODO?: надо ли учитывать (подкрутить день/два), если выходит выходной день?
    const firstSeptemberPrevYearDate = new Date(prevYear, 8, 1);
    const lastPrevYearDate = new Date(prevYear, 11, 31);

    return -(
      getWeekNumber(lastPrevYearDate) -
      getWeekNumber(firstSeptemberPrevYearDate) +
      1
    );
  }

  // Первая неделя февраля
  return firstFebruaryWeek;
};
