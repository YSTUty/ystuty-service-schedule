import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UptimeResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Время работы процесса в миллисекундах',
    example: 120000,
    minimum: 0,
  })
  public uptime: number;
}
