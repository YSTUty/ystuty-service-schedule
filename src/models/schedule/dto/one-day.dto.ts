import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { LessonDto } from './lesson.dto';
import { WeekDayDto } from './week-day.dto';

/**
 * Filtered Days with lessons from one week
 */
@Exclude()
export class OneDayDto {
  @Expose()
  @Type(() => WeekDayDto)
  @ApiProperty({ type: () => WeekDayDto })
  public info: WeekDayDto;

  @Expose()
  @Type(() => LessonDto)
  @ApiProperty({ type: () => [LessonDto] })
  public lessons: LessonDto[];
}
