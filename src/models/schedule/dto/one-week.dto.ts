import { ApiProperty } from '@nestjs/swagger';

import { OneDayDto } from './one-day.dto';

export class OneWeekDto {
  @ApiProperty({ example: 1, minimum: 1 })
  public number: number;

  @ApiProperty({ type: () => [OneDayDto] })
  public days: OneDayDto[];
}
