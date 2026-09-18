import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { WeekNumberType } from '@my-interfaces';

import { RaspGrWeekView } from '../entity';

import { GroupDetailDto, InstituteGroupsDto } from './institute-groups.dto';
import { OneWeekDto } from './one-week.dto';

/**
 * Состояние Redis-кэша для ответа с расписанием.
 */
export class CacheMetadataDto {
  @ApiProperty({
    description: 'Данные ответа были прочитаны из Redis-кэша',
    example: true,
  })
  public isCached: boolean;

  @ApiPropertyOptional({
    description: 'Оставшееся время жизни кэша в секундах',
    example: 417,
    nullable: true,
    minimum: 0,
  })
  public ttlSeconds: number | null;
}

/**
 * Общие поля ответов, использующих Redis-кэш.
 */
export class CachedScheduleResponseDto {
  @ApiProperty({
    deprecated: true,
    description:
      'Legacy-признак чтения данных из кэша. Используйте cache.isCached.',
    example: true,
  })
  public isCache: boolean;

  @ApiProperty({ type: CacheMetadataDto })
  public cache: CacheMetadataDto;
}

export class IdNameDto {
  @ApiProperty({ example: 42 })
  public id: number;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  public name: string;
}

export class ScheduleCountResponseDto extends CachedScheduleResponseDto {
  @ApiProperty({ example: 8 })
  public institutes: number;

  @ApiProperty({ example: 256 })
  public groups: number;

  @ApiProperty({ example: 460 })
  public teachers: number;

  @ApiProperty({ example: 260 })
  public audiences: number;
}

export class ActualGroupsResponseDto extends CachedScheduleResponseDto {
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Название расписания. В новых интеграциях не используйте.',
    nullable: true,
    example: '2025/2026 Осенний семестр',
  })
  public name: string | null;

  @ApiProperty({ type: [InstituteGroupsDto] })
  public items: InstituteGroupsDto<GroupDetailDto | string>[];
}

export class ScheduleItemsResponseDto extends CachedScheduleResponseDto {
  @ApiProperty({ type: [OneWeekDto] })
  public items: OneWeekDto[];
}

export class TeacherScheduleResponseDto extends ScheduleItemsResponseDto {
  @ApiProperty({ type: IdNameDto })
  public teacher: IdNameDto;
}

export class IdNameListResponseDto extends CachedScheduleResponseDto {
  @ApiProperty({ type: [IdNameDto] })
  public items: IdNameDto[];

  @ApiProperty({ example: 460, minimum: 0 })
  public count: number;
}

/**
 * Запись старого недельного представления расписания.
 */
export class WeeklyScheduleLessonDto {
  @ApiProperty({ example: 1 })
  public lessonNumber: number;

  @ApiProperty({ example: 123456 })
  public trainingId: number;

  @ApiProperty({ example: '08:30-10:00' })
  public timeInterval: string;

  @ApiPropertyOptional({ nullable: true })
  public textz?: string;

  @ApiPropertyOptional({ nullable: true })
  public textz1?: string;

  @ApiPropertyOptional({
    description: 'Недели проведения в формате исходной системы расписания',
    nullable: true,
  })
  public weeks?: string;

  @ApiPropertyOptional({ nullable: true })
  public weeksDistant?: string;

  @ApiPropertyOptional({ nullable: true })
  public lessonName?: string;

  @ApiPropertyOptional({ nullable: true })
  public lessonTypeStr?: string;

  @ApiPropertyOptional({ nullable: true })
  public additionalInfo?: string;

  @ApiProperty({ example: false })
  public isShort: boolean;

  @ApiPropertyOptional({ nullable: true })
  public auditoryName?: string;

  @ApiPropertyOptional({ nullable: true })
  public fioprep?: string;

  @ApiPropertyOptional({ nullable: true })
  public wred?: string;
}

export class GroupWeekItemDto {
  @ApiProperty({
    enum: WeekNumberType,
    enumName: 'WeekNumberType',
    example: WeekNumberType.Monday,
  })
  public weekType: WeekNumberType;

  @ApiProperty({
    type: [WeeklyScheduleLessonDto],
    description: 'Занятия этого дня и типа недели',
  })
  public week: RaspGrWeekView[];

  @ApiProperty({
    description: 'true — лекционная неделя, false — обычная',
    example: true,
  })
  public isLecture: boolean;
}

export class GroupWeekScheduleResponseDto extends CachedScheduleResponseDto {
  @ApiProperty({ type: [GroupWeekItemDto] })
  public items: GroupWeekItemDto[];
}

/**
 * Поля аудитории, которые возвращает all_audiences.
 */
export class AudienceDto {
  @ApiProperty({ example: 601 })
  public id: number;

  @ApiPropertyOptional({ example: 'В-201', nullable: true })
  public name?: string;

  @ApiPropertyOptional({ example: 30, nullable: true })
  public kolvo?: number;

  @ApiPropertyOptional({ example: 'В', nullable: true })
  public buildingName?: string;

  @ApiPropertyOptional({ example: 51, nullable: true })
  public sq?: number;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  public date0?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  public date1?: Date;

  @ApiPropertyOptional({ nullable: true })
  public note?: string;

  @ApiPropertyOptional({ nullable: true })
  public departmentShortName?: string;

  @ApiPropertyOptional({ nullable: true })
  public prsess?: number;

  @ApiPropertyOptional({ nullable: true })
  public floor?: number;
}
