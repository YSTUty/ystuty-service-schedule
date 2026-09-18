import { ApiProperty } from '@nestjs/swagger';

import { LessonDto } from './lesson.dto';
import { WeekDayDto } from './week-day.dto';

/**
 * Filtered Days with lessons from one week
 */
export class OneDayDto {
  @ApiProperty({ type: () => WeekDayDto })
  public info: WeekDayDto;

  @ApiProperty({ type: () => [LessonDto] })
  public lessons: LessonDto[];
}
