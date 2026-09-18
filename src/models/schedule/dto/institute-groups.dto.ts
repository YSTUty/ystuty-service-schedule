import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

export class GroupDetailDto {
  /**
   * Номер курса
   * @example 3
   */
  @ApiProperty({ example: 3 })
  public course: number;
  /**
   * Название группы
   * @example ЦИС-37
   */
  @ApiProperty({ example: 'ЦИС-37' })
  public name: string;
  /**
   * ID расписания группы
   * @deprecated Использовать `groupId`
   * @example 4627
   */
  @ApiPropertyOptional({ example: 4627, nullable: true, deprecated: true })
  public id_schedule: number | null;
  /**
   * ID расписания группы
   * @example 4627
   */
  @ApiPropertyOptional({ example: 4627, nullable: true })
  public groupId: number | null;
  /**
   * Есть ли лекционная неделя
   * @example true
   */
  @ApiProperty({ example: true })
  public hasLecture: boolean;
  /**
   * Название расписания
   * @example '2024/2025 Осенний семестр'
   */
  @ApiProperty({ example: '2025/2026 Осенний семестр' })
  public scheduleName: string;
}

/**
 * Название института и массив групп
 */
export class InstituteGroupsDto<GT = GroupDetailDto | string> {
  @ApiPropertyOptional({ example: 53, nullable: true })
  public id?: number;

  /**
   * Название института
   * @example Институт цифровых систем
   */
  @ApiProperty({ example: 'Институт цифровых систем' })
  public name: string;

  /**
   * Название групп (`string`) или детальная информация (`object`) о группах при `additional=true`
   */
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
