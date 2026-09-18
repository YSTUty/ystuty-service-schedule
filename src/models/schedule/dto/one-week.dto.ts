import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { OneDayDto } from './one-day.dto';

@Exclude()
export class OneWeekDto {
  @Expose()
  @ApiProperty({ example: 1, minimum: 1 })
  public number: number;

  @Expose()
  @Type(() => OneDayDto)
  @ApiProperty({ type: () => [OneDayDto] })
  public days: OneDayDto[];
}
