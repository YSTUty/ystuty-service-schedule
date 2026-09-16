import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcademicYearSummaryDto {
  @ApiPropertyOptional({ example: 2025, nullable: true })
  public id: number | null;

  @ApiPropertyOptional({ example: '2025/2026', nullable: true })
  public name: string | null;
}

export class SemesterSummaryDto {
  @ApiPropertyOptional({ example: 1, nullable: true })
  public id: number | null;

  @ApiPropertyOptional({ example: 'Осенний семестр', nullable: true })
  public name: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  public number: number | null;
}

/** Стабильное публичное описание доступного семестра расписания. */
export class ScheduleSemesterDto {
  @ApiProperty({ example: 123 })
  public id: number;

  @ApiProperty({ type: AcademicYearSummaryDto })
  public academicYear: AcademicYearSummaryDto;

  @ApiProperty({ type: SemesterSummaryDto })
  public semester: SemesterSummaryDto;

  @ApiPropertyOptional({
    example: '2025-09-01T00:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  public startsAt: Date | null;

  @ApiPropertyOptional({
    example: '2025-12-31T00:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  public endsAt: Date | null;

  @ApiProperty({ example: true })
  public isPublished: boolean;
}
