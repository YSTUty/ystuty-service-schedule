import { AudienceLessonDto, WeekDayDto } from '.';

/**
 * Filtered Days with lessons from one week for audience
 */
export class AudienceOneDayDto {
  info: WeekDayDto;
  lessons: AudienceLessonDto[];
}
