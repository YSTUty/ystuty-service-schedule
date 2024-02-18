import { LessonDto, WeekDayDto } from '.';

/**
 * Filtered Days with lessons from one week
 */
export class OneDayDto {
  info: WeekDayDto;
  lessons: LessonDto[];
}
