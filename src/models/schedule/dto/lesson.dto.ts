import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { LessonFlags, WeekParityType } from '@my-interfaces';

@Exclude()
export class LessonDto {
  @Expose({ toClassOnly: true })
  @ApiHideProperty()
  trainingId?: number;
  /**
   * Названия групп
   */
  @Expose()
  @ApiPropertyOptional({
    type: [String],
    example: ['ЦИС-37', 'ЦИС-38'],
  })
  public groups?: string[];
  /**
   * Порядковый номер пары на дню
   */
  @Expose()
  @ApiProperty({ example: 1, minimum: 1 })
  public number: number;
  /**
   * Временной интервал пары
   * @example '08:30-10:00'
   */
  @Expose()
  @ApiProperty({ example: '08:30-10:00' })
  public timeRange: string;
  /**
   * Timestamp начала пары
   * @example '2024-06-04T09:20:00.000Z'
   */
  @Expose()
  @ApiPropertyOptional({
    example: '2025-09-01T08:30:00.000Z',
    format: 'date-time',
    nullable: true,
    type: String,
  })
  public startAt?: string | Date;
  /**
   * Timestamp конца пары
   * @example '2024-06-04T12:30:00.000Z'
   */
  @Expose()
  @ApiPropertyOptional({
    example: '2025-09-01T10:00:00.000Z',
    format: 'date-time',
    nullable: true,
    type: String,
  })
  public endAt?: string | Date;
  /**
   * Оригинальная строка с порядковым номером пары на дню со интервалом времени
   *
   * @example '1. 08:30-...4ч'
   */
  @Expose()
  @ApiProperty({ example: '1. 08:30-10:00' })
  public originalTimeTitle: string;
  /**
   * Тип четности пары на неделе
   */
  @Expose()
  @ApiProperty({
    enum: WeekParityType,
    enumName: 'WeekParityType',
    example: WeekParityType.ODD,
  })
  public parity: WeekParityType;
  /**
   * Пара дистанционно
   */
  @Expose()
  @ApiPropertyOptional({ example: false })
  public isDistant?: boolean;
  /**
   * Название предмета пары
   */
  @Expose()
  @ApiPropertyOptional({ example: 'Математика', nullable: true })
  public lessonName?: string;
  /**
   * Флаг типа пары
   */
  @Expose()
  @ApiProperty({
    description: 'Числовая комбинация флагов LessonFlags',
    enum: LessonFlags,
    enumName: 'LessonFlags',
    example: LessonFlags.Lecture,
  })
  public type: LessonFlags;
  /**
   * Занятия в потоке
   */
  @Expose()
  @ApiProperty({ example: false })
  public isStream: boolean;
  /**
   * Длительность пары в академических часах
   */
  @Expose()
  @ApiProperty({ example: 2, minimum: 0 })
  public duration: number;
  /**
   * Длительность пары в минутах
   */
  @Expose()
  @ApiProperty({ example: 90, minimum: 0 })
  public durationMinutes: number;
  /**
   * Разделение по подгруппам
   */
  @Expose()
  @ApiProperty({ example: false })
  public isDivision: boolean;
  /**
   * Сокращенная пара
   */
  @Expose()
  @ApiPropertyOptional({ example: false })
  public isShort?: boolean;
  /**
   * Пара на лекционной неделе
   */
  @Expose()
  @ApiPropertyOptional({ example: true })
  public isLecture?: boolean;
  /**
   * Буква корпуса и номер аудитори
   */
  @Expose()
  @ApiPropertyOptional({ example: 'В-201', nullable: true })
  public auditoryName?: string;
  /**
   * Буква корпуса и номер дополнительной аудитори
   */
  @Expose()
  @ApiPropertyOptional({ example: 'В-202', nullable: true })
  public additionalAuditoryName?: string;
  /**
   * ФИО преподователя
   *
   * @example 'Иванов ИИ'
   */
  @Expose()
  @ApiPropertyOptional({ example: 'Иванов ИИ', nullable: true })
  public teacherName?: string;

  @Expose()
  @ApiPropertyOptional({ example: 42, nullable: true })
  public teacherId?: number;
  /**
   * ФИО второго преподователя
   *
   * @example 'Иванов ИИ'
   */
  @Expose()
  @ApiPropertyOptional({ example: 'Петров ПП', nullable: true })
  public additionalTeacherName?: string;

  @Expose()
  @ApiPropertyOptional({ example: 84, nullable: true })
  public additionalTeacherId?: number;
  /**
   * Дополнительная информация
   */
  @Expose()
  @ApiPropertyOptional({ example: 'Дистант', nullable: true })
  public subInfo?: string;

  constructor(input?: Partial<LessonDto>) {
    if (input) {
      Object.assign(this, plainToClass(LessonDto, input));
    }
  }
}
