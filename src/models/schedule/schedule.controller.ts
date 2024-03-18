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
import {
  AudienceOneWeekDto,
  GroupDetailDto,
  InstituteGroupsDto,
  OneWeekDto,
  TeacherOneWeekDto,
} from './dto';

@ApiTags('schedule')
@Controller('/schedule')
@UseInterceptors(ClassSerializerInterceptor)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('count')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть список с количеством различных данных' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: { type: 'boolean' },
        institutes: { type: 'number', example: 8 },
        groups: { type: 'number', example: 256 },
        teachers: { type: 'number', example: 460 },
        audiences: { type: 'number', example: 260 },
      },
    },
  })
  async getCount() {
    const institutes = await this.scheduleService.getCount('institute');
    const groups = await this.scheduleService.getCount('group');
    const teachers = await this.scheduleService.getCount('teachers');
    const audiences = await this.scheduleService.getCount('audiences');

    return {
      isCache:
        institutes.isCache ||
        groups.isCache ||
        teachers.isCache ||
        audiences.isCache,
      institutes: institutes.count,
      groups: groups.count,
      teachers: teachers.count,
      audiences: audiences.count,
    };
  }

  @Get('actual_groups')
  @Version('1')
  @Throttle({ default: { limit: 4, ttl: 10e3 } })
  @ApiOperation({ summary: 'Вернуть список актуальных групп по институтам' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: { type: 'boolean' },
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
        isCache: { type: 'boolean' },
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
      groupIdOrName,
      idSchedule,
    );

    if (!result) {
      throw new NotFoundException(
        `group not found by this name or id${idSchedule ? ' or idschedule' : ''}`,
      );
    }
    return result;
  }

  @Get('actual_teachers')
  @Version('1')
  @ApiOperation({ summary: 'Список преподавателей в текущем семестре' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: { type: 'boolean' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
            },
          },
          example: [
            { id: 1, name: 'Иванов Иван Иванович' },
            { id: 2, name: 'Петров Петр Петрович' },
            { id: 3, name: 'Сидоров Сидор Сидорович' },
            { id: 4, name: 'Семенов Семен Семенович' },
            { id: 5, name: 'Павлов Павел Павлович' },
          ],
        },
      },
    },
  })
  async getTeachers() {
    const result = await this.scheduleService.getTeachersBySchedule(0);

    if (!result) {
      throw new NotFoundException('teachers not found for current shedule');
    }
    return result;
  }

  @Get('teacher/:teacherId')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть расписание для выбранного преподавателя' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: { type: 'boolean' },
        teacher: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(TeacherOneWeekDto) },
        },
      },
    },
  })
  @ApiExtraModels(TeacherOneWeekDto)
  async getByTeacher(@Param('teacherId', ParseIntPipe) teacherId: number) {
    const result = await this.scheduleService.getByTeacher(teacherId);

    if (!result) {
      throw new NotFoundException('teacher not found by this name or id');
    }
    return result;
  }

  @Get('actual_audiences')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть список аудиторий на текущий семестр' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: { type: 'boolean' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
            },
          },
          example: [
            { id: 601, name: 'В-201' },
            { id: 354, name: 'Б-203' },
          ],
        },
        count: {
          type: 'number',
          example: 2,
        },
      },
    },
  })
  async getAudiences() {
    const result = await this.scheduleService.getAudiencesBySchedule(0);

    if (!result) {
      throw new NotFoundException('audience not found for current shedule');
    }
    return result;
  }

  @Get('audience/:audienceIdOrName')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть расписание для выбранной аудитории' })
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
        isCache: { type: 'boolean' },
        audience: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(AudienceOneWeekDto) },
        },
      },
    },
  })
  @ApiExtraModels(AudienceOneWeekDto)
  async getByAudience(
    @Param('audienceIdOrName') audienceIdOrName: string,
    @Query('idschedule', new DefaultValuePipe(0), ParseIntPipe)
    idSchedule: number,
  ) {
    const data = await this.scheduleService.getByAudience(
      audienceIdOrName,
      idSchedule,
    );
    if (!data) {
      throw new NotFoundException(
        `audience not found by this name or id${idSchedule ? ' or idschedule' : ''}`,
      );
    }
    return data;
  }
}
