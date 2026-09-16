import {
  applyDecorators,
  BadRequestException,
  ClassSerializerInterceptor,
  Controller,
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

import {
  NeedAuth,
  OAuth2RequiredScope,
  RateLimitHeavyRead,
  RateLimitPublicRead,
} from '@my-common';
import { WeekNumberType } from '@my-interfaces';

import {
  GroupDetailDto,
  InstituteGroupsDto,
  OneWeekDto,
  ScheduleSemesterDto,
  SemesterQueryDto,
} from './dto';
import { RaspGrWeekView } from './entity';
import { ScheduleService } from './schedule.service';

const ApiSemesterQuery = () =>
  applyDecorators(
    ApiQuery({
      name: 'semesterId',
      description: 'Публичный идентификатор опубликованного семестра',
      type: Number,
      required: false,
      minimum: 1,
    }),
    ApiQuery({
      name: 'idschedule',
      description:
        'Устаревший alias semesterId. Не используйте в новых интеграциях.',
      type: Number,
      required: false,
      minimum: 0,
      deprecated: true,
    }),
  );

@ApiTags('schedule')
@Controller('/schedule')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExtraModels(OneWeekDto)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * Нормализует новый query-параметр и legacy alias перед чтением расписания.
   */
  private async getPublicSemesterId(query: SemesterQueryDto): Promise<number> {
    if (
      query.semesterId !== undefined &&
      query.idschedule !== undefined &&
      query.semesterId !== query.idschedule
    ) {
      throw new BadRequestException(
        'semesterId and idschedule must match when both are provided',
      );
    }

    const semesterId = query.semesterId ?? query.idschedule ?? 0;
    const publicSemesterId =
      await this.scheduleService.resolvePublicSemesterId(semesterId);
    if (publicSemesterId === null) {
      throw new NotFoundException('published semester not found');
    }

    return publicSemesterId;
  }

  @Get('count')
  @Version('1')
  @ApiSemesterQuery()
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
  async getCount(@Query() query: SemesterQueryDto) {
    const semesterId = await this.getPublicSemesterId(query);
    const institutes = await this.scheduleService.getCount(
      'institute',
      semesterId,
    );
    const groups = await this.scheduleService.getCount('group', semesterId);
    const teachers = await this.scheduleService.getCount(
      'teachers',
      semesterId,
    );
    const audiences = await this.scheduleService.getCount(
      'audiences',
      semesterId,
    );
    const results = [institutes, groups, teachers, audiences];
    const isFullyCached = results.every((result) => result.cache.isCached);

    return {
      isCache: results.some((result) => result.isCache),
      cache: {
        isCached: isFullyCached,
        ttlSeconds: isFullyCached
          ? Math.min(...results.map((result) => result.cache.ttlSeconds))
          : null,
      },
      institutes: institutes.count,
      groups: groups.count,
      teachers: teachers.count,
      audiences: audiences.count,
    };
  }

  @Get('actual_groups')
  @Version('1')
  @RateLimitPublicRead()
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
  @ApiSemesterQuery()
  async getActualGroups(
    @Query('additional') additional: boolean = false,
    @Query() query: SemesterQueryDto,
  ) {
    const semesterId = await this.getPublicSemesterId(query);
    return await this.scheduleService.getGroups(semesterId, additional);
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
  @ApiSemesterQuery()
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: { type: 'boolean' },
        items: {
          type: 'array',
          items: { $ref: getSchemaPath(OneWeekDto) },
        },
      },
    },
  })
  async getByGroup(
    @Param('groupIdOrName') groupIdOrName: string,
    @Query() query: SemesterQueryDto,
  ) {
    const semesterId = await this.getPublicSemesterId(query);
    const result = await this.scheduleService.getByGroup(
      groupIdOrName,
      semesterId,
    );

    if (!result) {
      throw new NotFoundException('group not found by this name or id');
    }
    return result;
  }

  @Get('group_week/:groupIdOrName')
  @Version('1')
  @ApiOperation({
    summary: 'Вернуть расписание для выбранной группы с интервалами по неделям',
  })
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
  @ApiSemesterQuery()
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        isCache: { type: 'boolean' },
        items: {
          type: 'array',
          items: {
            properties: {
              weekType: {
                type: 'enum',
                enum: Object.keys(WeekNumberType).filter(
                  (e) => !isNaN(Number(e)),
                ),
              },
              week: {
                type: 'array',
                items: { $ref: getSchemaPath(RaspGrWeekView) },
              },
              isLecture: {
                type: 'boolean',
              },
            },
          },
        },
      },
    },
  })
  @ApiExtraModels(RaspGrWeekView)
  @RateLimitPublicRead()
  @NeedAuth()
  @OAuth2RequiredScope('schedule', ['advanced'], ['read'])
  async getByGroupAsWeek(
    @Param('groupIdOrName') groupIdOrName: string,
    @Query() query: SemesterQueryDto,
  ) {
    const semesterId = await this.getPublicSemesterId(query);
    const result = await this.scheduleService.getByGroupAsWeek(
      groupIdOrName,
      semesterId,
    );

    if (!result) {
      throw new NotFoundException('group not found by this name or id');
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
  @ApiSemesterQuery()
  async getTeachers(@Query() query: SemesterQueryDto) {
    const semesterId = await this.getPublicSemesterId(query);
    const result = await this.scheduleService.getTeachersBySchedule(semesterId);

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
          items: { $ref: getSchemaPath(OneWeekDto) },
        },
      },
    },
  })
  @ApiSemesterQuery()
  async getByTeacher(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Query() query: SemesterQueryDto,
  ) {
    const semesterId = await this.getPublicSemesterId(query);
    const result = await this.scheduleService.getByTeacher(
      teacherId,
      semesterId,
    );

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
  @ApiSemesterQuery()
  async getAudiences(@Query() query: SemesterQueryDto) {
    const semesterId = await this.getPublicSemesterId(query);
    const result =
      await this.scheduleService.getAudiencesBySchedule(semesterId);

    if (!result) {
      throw new NotFoundException('audience not found for current shedule');
    }
    return result;
  }

  @Get('audience/:audienceIdOrName')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть расписание для выбранной аудитории' })
  @ApiSemesterQuery()
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
          items: { $ref: getSchemaPath(OneWeekDto) },
        },
      },
    },
  })
  async getByAudience(
    @Param('audienceIdOrName') audienceIdOrName: string,
    @Query() query: SemesterQueryDto,
  ) {
    const semesterId = await this.getPublicSemesterId(query);
    const data = await this.scheduleService.getByAudience(
      audienceIdOrName,
      semesterId,
    );
    if (!data) {
      throw new NotFoundException('audience not found by this name or id');
    }
    return data;
  }

  @Get('all_audiences')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть список всех аудиторий' })
  @RateLimitHeavyRead()
  @NeedAuth()
  @OAuth2RequiredScope('schedule', ['read'])
  async getAllAudiences() {
    const result = await this.scheduleService.getAudiences();

    if (!result) {
      throw new NotFoundException('audience not found');
    }
    return result;
  }

  @Get('all_semesters')
  @Version('1')
  @ApiOperation({ summary: 'Вернуть список всех семестров' })
  @RateLimitHeavyRead()
  @NeedAuth()
  @OAuth2RequiredScope('schedule', ['read'])
  @ApiResponse({ status: 200, type: [ScheduleSemesterDto] })
  async getScheduleSemesters() {
    const result = await this.scheduleService.getScheduleSemesters();

    if (!result) {
      throw new NotFoundException('semesters not found');
    }
    return result;
  }
}
