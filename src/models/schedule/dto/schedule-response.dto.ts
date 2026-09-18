import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { WeekNumberType } from '@my-interfaces';

import { RaspGrWeekView } from '../entity';

import { GroupDetailDto, InstituteGroupsDto } from './institute-groups.dto';
import { OneWeekDto } from './one-week.dto';

/**
 * Состояние Redis-кэша для ответа с расписанием.
 */
@Exclude()
export class CacheMetadataDto {
  @Expose()
  @ApiProperty({
    description: 'Данные ответа были прочитаны из Redis-кэша',
    example: true,
  })
  public isCached: boolean;

  @Expose()
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
@Exclude()
export class CachedScheduleResponseDto {
  @Expose()
  @ApiProperty({
    deprecated: true,
    description:
      'Legacy-признак чтения данных из кэша. Используйте cache.isCached.',
    example: true,
  })
  public isCache: boolean;

  @Expose()
  @Type(() => CacheMetadataDto)
  @ApiProperty({ type: CacheMetadataDto })
  public cache: CacheMetadataDto;
}

@Exclude()
export class IdNameDto {
  @Expose()
  @ApiProperty({ example: 42 })
  public id: number;

  @Expose()
  @ApiProperty({ example: 'Иванов Иван Иванович' })
  public name: string;
}

export class ScheduleCountResponseDto extends CachedScheduleResponseDto {
  @Expose()
  @ApiProperty({ example: 8 })
  public institutes: number;

  @Expose()
  @ApiProperty({ example: 256 })
  public groups: number;

  @Expose()
  @ApiProperty({ example: 460 })
  public teachers: number;

  @Expose()
  @ApiProperty({ example: 260 })
  public audiences: number;
}

export class ActualGroupsResponseDto extends CachedScheduleResponseDto {
  @Expose()
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Название расписания. В новых интеграциях не используйте.',
    nullable: true,
    example: '2025/2026 Осенний семестр',
  })
  public name: string | null;

  @Expose()
  @Type(() => InstituteGroupsDto)
  @ApiProperty({ type: [InstituteGroupsDto] })
  public items: InstituteGroupsDto<GroupDetailDto | string>[];
}

export class ScheduleItemsResponseDto extends CachedScheduleResponseDto {
  @Expose()
  @Type(() => OneWeekDto)
  @ApiProperty({ type: [OneWeekDto] })
  public items: OneWeekDto[];
}

export class TeacherScheduleResponseDto extends ScheduleItemsResponseDto {
  @Expose()
  @Type(() => IdNameDto)
  @ApiProperty({ type: IdNameDto })
  public teacher: IdNameDto;
}

export class IdNameListResponseDto extends CachedScheduleResponseDto {
  @Expose()
  @Type(() => IdNameDto)
  @ApiProperty({ type: [IdNameDto] })
  public items: IdNameDto[];

  @Expose()
  @ApiProperty({ example: 460, minimum: 0 })
  public count: number;
}

/**
 * Запись старого недельного представления расписания.
 */
@Exclude()
export class WeeklyScheduleLessonDto {
  @Expose()
  @ApiProperty({ example: 1 })
  public lessonNumber: number;

  @Expose()
  @ApiProperty({ example: 123456 })
  public trainingId: number;

  @Expose()
  @ApiProperty({ example: '08:30-10:00' })
  public timeInterval: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public textz?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public textz1?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Недели проведения в формате исходной системы расписания',
    nullable: true,
  })
  public weeks?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public weeksDistant?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public lessonName?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public lessonTypeStr?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public additionalInfo?: string;

  @Expose()
  @ApiProperty({ example: false })
  public isShort: boolean;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public auditoryName?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public fioprep?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public wred?: string;
}

@Exclude()
export class GroupWeekItemDto {
  @Expose()
  @ApiProperty({
    enum: WeekNumberType,
    enumName: 'WeekNumberType',
    example: WeekNumberType.Monday,
  })
  public weekType: WeekNumberType;

  @Expose()
  @Type(() => WeeklyScheduleLessonDto)
  @ApiProperty({
    type: [WeeklyScheduleLessonDto],
    description: 'Занятия этого дня и типа недели',
  })
  public week: RaspGrWeekView[];

  @Expose()
  @ApiProperty({
    description: 'true — лекционная неделя, false — обычная',
    example: true,
  })
  public isLecture: boolean;
}

export class GroupWeekScheduleResponseDto extends CachedScheduleResponseDto {
  @Expose()
  @Type(() => GroupWeekItemDto)
  @ApiProperty({ type: [GroupWeekItemDto] })
  public items: GroupWeekItemDto[];
}

/**
 * Поля аудитории, которые возвращает all_audiences.
 */
@Exclude()
export class AudienceDto {
  @Expose()
  @ApiProperty({ example: 601 })
  public id: number;

  @Expose()
  @ApiPropertyOptional({ example: 'В-201', nullable: true })
  public name?: string;

  @Expose()
  @ApiPropertyOptional({ example: 30, nullable: true })
  public kolvo?: number;

  @Expose()
  @ApiPropertyOptional({ example: 'В', nullable: true })
  public buildingName?: string;

  @Expose()
  @ApiPropertyOptional({ example: 51, nullable: true })
  public sq?: number;

  @Expose()
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  public date0?: Date;

  @Expose()
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  public date1?: Date;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public note?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public departmentShortName?: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public prsess?: number;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  public floor?: number;
}
