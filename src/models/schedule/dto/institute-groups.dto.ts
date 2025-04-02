import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class GroupDetailDto {
  /**
   * Номер курса
   * @example 3
   */
  course: number;
  /**
   * Название группы
   * @example ЦИС-37
   */
  name: string;
  /**
   * ID расписания группы
   * @deprecated Использовать `groupId`
   * @example 4627
   */
  id_schedule: number | null;
  /**
   * ID расписания группы
   * @example 4627
   */
  groupId: number | null;
  /**
   * Есть ли лекционная неделя
   * @example true
   */
  hasLecture: boolean;
  /**
   * Название расписания
   * @example '2024/2025 Осенний семестр'
   */
  scheduleName: string;
}

/**
 * Название института и массив групп
 */
export class InstituteGroupsDto<GT = GroupDetailDto | string> {
  id?: number;

  /**
   * Название института
   * @example Институт цифровых систем
   */
  name: string;

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
  groups: GT[];
}
