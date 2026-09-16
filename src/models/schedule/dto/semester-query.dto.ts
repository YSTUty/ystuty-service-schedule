import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Выбор опубликованного семестра. idschedule оставлен для обратной совместимости.
 */
export class SemesterQueryDto {
  @ApiPropertyOptional({
    description: 'Публичный идентификатор опубликованного семестра',
    example: 123,
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  public semesterId?: number;

  @ApiPropertyOptional({
    description:
      'Устаревший alias semesterId. Не используйте в новых интеграциях.',
    example: 123,
    minimum: 0,
    deprecated: true,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  public idschedule?: number;
}
