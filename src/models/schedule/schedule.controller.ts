import {
  ClassSerializerInterceptor,
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ScheduleService } from './schedule.service';
import { GroupDetailDto, InstituteGroupsDto, OneWeekDto } from './dto';

@ApiTags('schedule')
@Controller('/schedule')
@UseInterceptors(ClassSerializerInterceptor)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('actual_groups')
  @Version('1')
  @Throttle({ default: { limit: 4, ttl: 10e3 } })
  @ApiOperation({ summary: 'Вернуть список актуальных групп по институтам' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        // isCache: {
        //   type: 'boolean',
        // },
        name: {
          type: 'string',
          description: 'Название семестра',
        },
        items: {
          type: 'array',
          items: {
            $ref: getSchemaPath(InstituteGroupsDto),
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'additional',
    description: 'Вернуть расширенную информацию о группах',
    required: false,
    schema: {
      default: false,
      type: 'boolean',
    },
  })
  @ApiExtraModels(InstituteGroupsDto, GroupDetailDto)
  async getActualGroups(@Query('additional') additional: boolean = false) {
    return await this.scheduleService.getGroups(0, additional);
  }

  @Get('group/:groupIdOrName')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть расписание для выбранной группы' })
  @ApiParam({
    name: 'groupIdOrName',
    description: 'Название или ID группы',
    allowEmptyValue: false,
    examples: {
      eis46: {
        summary: 'Группа ЦИС-37',
        value: 'ЦИС-37',
      },
      sar14: {
        summary: 'Группа САР-24',
        value: 'САР-24',
      },
      // id4627: {
      //   summary: 'Группа ТСД-11 по id (4627)',
      //   value: '4627',
      // },
    },
  })
  @ApiQuery({
    name: 'idschedule',
    description: '',
    type: Number,
    required: false,
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: {
          type: 'boolean',
        },
        items: {
          type: 'array',
          items: {
            $ref: getSchemaPath(OneWeekDto),
          },
        },
      },
    },
  })
  @ApiExtraModels(OneWeekDto)
  async getByGroup(
    @Param('groupIdOrName') groupIdOrName: string,
    @Query('idschedule', new DefaultValuePipe(0), ParseIntPipe)
    idSchedule: number,
  ) {
    const result = await this.scheduleService.getByGroup(
      idSchedule,
      groupIdOrName,
    );

    if (!result) {
      throw new NotFoundException(
        `group not found by this name or id${idSchedule ? ' or idschedule' : ''}`,
      );
    }
    return result;
  }
}
