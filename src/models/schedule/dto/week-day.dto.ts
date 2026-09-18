import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { WeekNumberType } from '@my-interfaces';

@Exclude()
export class WeekDayDto {
  /** Тип/номер дня недели */
  @Expose()
  @ApiProperty({
    enum: WeekNumberType,
    enumName: 'WeekNumberType',
    example: WeekNumberType.Monday,
  })
  public type: WeekNumberType;

  /** Дата дня недели */
  @Expose()
  @ApiProperty({
    example: '2025-09-01T00:00:00.000Z',
    format: 'date-time',
  })
  public date: Date;

  /** Номер недели в семестре */
  @Expose()
  @ApiProperty({ example: 1, minimum: 1 })
  public weekNumber: number;
}
