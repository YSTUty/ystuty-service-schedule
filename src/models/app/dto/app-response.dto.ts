import { ApiProperty } from '@nestjs/swagger';

export class UptimeResponseDto {
  @ApiProperty({
    description: 'Время работы процесса в миллисекундах',
    example: 120000,
    minimum: 0,
  })
  public uptime: number;
}
