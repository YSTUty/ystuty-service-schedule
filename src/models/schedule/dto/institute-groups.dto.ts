import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class GroupDetailDto {
  /**
   * Номер курса
   * @example 3
   */
  @Expose()
  @ApiProperty({ example: 3 })
  public course: number;
  /**
   * Название группы
   * @example ЦИС-37
   */
  @Expose()
  @ApiProperty({ example: 'ЦИС-37' })
  public name: string;
  /**
   * ID расписания группы
   * @deprecated Использовать `groupId`
   * @example 4627
   */
  @Expose()
  @ApiPropertyOptional({ example: 4627, nullable: true, deprecated: true })
  public id_schedule: number | null;
  /**
   * ID расписания группы
   * @example 4627
   */
  @Expose()
  @ApiPropertyOptional({ example: 4627, nullable: true })
  public groupId: number | null;
  /**
   * Есть ли лекционная неделя
   * @example true
   */
  @Expose()
  @ApiProperty({ example: true })
  public hasLecture: boolean;
  /**
   * Название расписания
   * @example '2024/2025 Осенний семестр'
   */
  @Expose()
  @ApiProperty({ example: '2025/2026 Осенний семестр' })
  public scheduleName: string;
}

/**
 * Название института и массив групп
 */
@Exclude()
export class InstituteGroupsDto<GT = GroupDetailDto | string> {
  @Expose()
  @ApiPropertyOptional({ example: 53, nullable: true })
  public id?: number;

  /**
   * Название института
   * @example Институт цифровых систем
   */
  @Expose()
  @ApiProperty({ example: 'Институт цифровых систем' })
  public name: string;

  /**
   * Название групп (`string`) или детальная информация (`object`) о группах при `additional=true`
   */
  @Expose()
  @Type(() => GroupDetailDto)
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(GroupDetailDto) },
        {
          type: 'string',
          examples: ['ЦИС-37', 'САР-24'],
        },
      ],
    },
  })
  public groups: GT[];
}
