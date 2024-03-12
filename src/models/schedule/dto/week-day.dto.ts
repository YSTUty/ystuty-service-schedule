import { WeekNumberType } from '@my-interfaces';

export class WeekDayDto {
  /** Тип/номер дня недели */
  type: WeekNumberType;
  /** Дата дня недели */
  date: Date;
  /** Номер недели в семестре */
  weekNumber: number;
}
