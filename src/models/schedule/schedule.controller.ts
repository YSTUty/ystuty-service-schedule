import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
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

import { ScheduleService } from './schedule.service';
import { OneWeekDto } from './dto';

@ApiTags('schedule')
@Controller('/schedule')
@UseInterceptors(ClassSerializerInterceptor)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('actual_groups')
  async getActualGroups() {
    return await this.scheduleService.getGroups(0, true);
  }

  @Get('group/:groupIdOrName')
  @ApiOperation({ summary: 'Get a schedule for the specified group' })
  @ApiParam({
    name: 'groupIdOrName',
    description: 'Group name or ID',
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
        name: {
          type: 'string',
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
    @Query('idschedule') idSchedule: number = 0,
  ) {
    const result = await this.scheduleService.getByGroup(
      idSchedule,
      groupIdOrName,
    );

    if (result.items.length === 0) {
      throw new NotFoundException('group not found by this name or id');
    }
    return result;
  }
}
