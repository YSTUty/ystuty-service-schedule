import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Ошибка одного поля, возвращаемая ValidationHttpPipe.
 */
export class ApiValidationErrorDto {
  @ApiProperty({ example: 'semesterId' })
  public property: string;

  @ApiProperty({
    example: {
      min: 'semesterId must not be less than 1',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  public constraints: Record<string, string>;
}

/**
 * Внутренняя часть единого HTTP-ответа об ошибке.
 */
export class ApiErrorDto {
  @ApiProperty({ example: 404 })
  public code: number;

  @ApiPropertyOptional({
    example: 'group not found by this name or id',
    nullable: true,
  })
  public message?: string;

  @ApiProperty({ example: 'NotFoundException' })
  public error: string;

  @ApiProperty({
    example: '2026-09-18T08:00:00.000Z',
    format: 'date-time',
  })
  public timestamp: string;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  public payload?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [ApiValidationErrorDto], nullable: true })
  public validation?: ApiValidationErrorDto[];
}

/**
 * Формат ошибок, который возвращает HttpAndRpcExceptionFilter по HTTP.
 */
export class ApiErrorResponseDto {
  @ApiProperty({ type: ApiErrorDto })
  public error: ApiErrorDto;
}
