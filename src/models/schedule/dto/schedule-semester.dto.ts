import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class AcademicYearSummaryDto {
  @Expose()
  @ApiPropertyOptional({ example: 2025, nullable: true })
  public id: number | null;

  @Expose()
  @ApiPropertyOptional({ example: '2025/2026', nullable: true })
  public name: string | null;
}

@Exclude()
export class SemesterSummaryDto {
  @Expose()
  @ApiPropertyOptional({ example: 1, nullable: true })
  public id: number | null;

  @Expose()
  @ApiPropertyOptional({ example: 'Осенний семестр', nullable: true })
  public name: string | null;

  @Expose()
  @ApiPropertyOptional({ example: 1, nullable: true })
  public number: number | null;
}

/** Стабильное публичное описание доступного семестра расписания. */
@Exclude()
export class ScheduleSemesterDto {
  @Expose()
  @ApiProperty({ example: 123 })
  public id: number;

  @Expose()
  @Type(() => AcademicYearSummaryDto)
  @ApiProperty({ type: AcademicYearSummaryDto })
  public academicYear: AcademicYearSummaryDto;

  @Expose()
  @Type(() => SemesterSummaryDto)
  @ApiProperty({ type: SemesterSummaryDto })
  public semester: SemesterSummaryDto;

  @Expose()
  @ApiPropertyOptional({
    example: '2025-09-01T00:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  public startsAt: Date | null;

  @Expose()
  @ApiPropertyOptional({
    example: '2025-12-31T00:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  public endsAt: Date | null;

  @Expose()
  @ApiProperty({ example: true })
  public isPublished: boolean;
}
