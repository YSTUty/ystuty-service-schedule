import { TeacherLessonDto, WeekDayDto } from '.';

/**
 * Filtered Days with lessons from one week for teacher
 */
export class TeacherOneDayDto {
  info: WeekDayDto;
  lessons: TeacherLessonDto[];
}
