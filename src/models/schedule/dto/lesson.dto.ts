import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Exclude, plainToClass } from 'class-transformer';

import { LessonFlags, WeekParityType } from '@my-interfaces';

export class LessonDto {
  @Exclude({ toPlainOnly: true })
  @ApiHideProperty()
  trainingId?: number;
  /**
   * Названия групп
   */
  @ApiPropertyOptional({
    type: [String],
    example: ['ЦИС-37', 'ЦИС-38'],
  })
  public groups?: string[];
  /**
   * Порядковый номер пары на дню
   */
  @ApiProperty({ example: 1, minimum: 1 })
  public number: number;
  /**
   * Временной интервал пары
   * @example '08:30-10:00'
   */
  @ApiProperty({ example: '08:30-10:00' })
  public timeRange: string;
  /**
   * Timestamp начала пары
   * @example '2024-06-04T09:20:00.000Z'
   */
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
  @ApiProperty({ example: '1. 08:30-10:00' })
  public originalTimeTitle: string;
  /**
   * Тип четности пары на неделе
   */
  @ApiProperty({
    enum: WeekParityType,
    enumName: 'WeekParityType',
    example: WeekParityType.ODD,
  })
  public parity: WeekParityType;
  /**
   * Пара дистанционно
   */
  @ApiPropertyOptional({ example: false })
  public isDistant?: boolean;
  /**
   * Название предмета пары
   */
  @ApiPropertyOptional({ example: 'Математика', nullable: true })
  public lessonName?: string;
  /**
   * Флаг типа пары
   */
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
  @ApiProperty({ example: false })
  public isStream: boolean;
  /**
   * Длительность пары в академических часах
   */
  @ApiProperty({ example: 2, minimum: 0 })
  public duration: number;
  /**
   * Длительность пары в минутах
   */
  @ApiProperty({ example: 90, minimum: 0 })
  public durationMinutes: number;
  /**
   * Разделение по подгруппам
   */
  @ApiProperty({ example: false })
  public isDivision: boolean;
  /**
   * Сокращенная пара
   */
  @ApiPropertyOptional({ example: false })
  public isShort?: boolean;
  /**
   * Пара на лекционной неделе
   */
  @ApiPropertyOptional({ example: true })
  public isLecture?: boolean;
  /**
   * Буква корпуса и номер аудитори
   */
  @ApiPropertyOptional({ example: 'В-201', nullable: true })
  public auditoryName?: string;
  /**
   * Буква корпуса и номер дополнительной аудитори
   */
  @ApiPropertyOptional({ example: 'В-202', nullable: true })
  public additionalAuditoryName?: string;
  /**
   * ФИО преподователя
   *
   * @example 'Иванов ИИ'
   */
  @ApiPropertyOptional({ example: 'Иванов ИИ', nullable: true })
  public teacherName?: string;

  @ApiPropertyOptional({ example: 42, nullable: true })
  public teacherId?: number;
  /**
   * ФИО второго преподователя
   *
   * @example 'Иванов ИИ'
   */
  @ApiPropertyOptional({ example: 'Петров ПП', nullable: true })
  public additionalTeacherName?: string;

  @ApiPropertyOptional({ example: 84, nullable: true })
  public additionalTeacherId?: number;
  /**
   * Дополнительная информация
   */
  @ApiPropertyOptional({ example: 'Дистант', nullable: true })
  public subInfo?: string;

  constructor(input?: Partial<LessonDto>) {
    if (input) {
      Object.assign(this, plainToClass(LessonDto, input));
    }
  }
}
