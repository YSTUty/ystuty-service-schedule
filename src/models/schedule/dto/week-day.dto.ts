import { ApiProperty } from '@nestjs/swagger';

import { WeekNumberType } from '@my-interfaces';

export class WeekDayDto {
  /** Тип/номер дня недели */
  @ApiProperty({
    enum: WeekNumberType,
    enumName: 'WeekNumberType',
    example: WeekNumberType.Monday,
  })
  public type: WeekNumberType;

  /** Дата дня недели */
  @ApiProperty({
    example: '2025-09-01T00:00:00.000Z',
    format: 'date-time',
  })
  public date: Date;

  /** Номер недели в семестре */
  @ApiProperty({ example: 1, minimum: 1 })
  public weekNumber: number;
}
