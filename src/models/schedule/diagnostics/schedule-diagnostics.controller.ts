import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Version,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';

import { OnlyDev, RateLimitHeavyRead } from '@my-common';

import { ScheduleService } from '../schedule.service';

import { ScheduleLessonTypeDiagnosticsService } from './schedule-lesson-type-diagnostics.service';

@ApiTags('schedule')
@Controller('/schedule/debug')
export class ScheduleDiagnosticsController {
  constructor(
    private readonly diagnosticsService: ScheduleLessonTypeDiagnosticsService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /**
   * Возвращает сырые форматы занятий и результат текущей классификации типов.
   * Маршрут нужен только для анализа изменений источника расписания.
   */
  @Get('lesson-types')
  @Version('1')
  @ApiExcludeEndpoint()
  @OnlyDev()
  @RateLimitHeavyRead()
  async getLessonTypes() {
    return await this.diagnosticsService.getLessonTypeReport();
  }

  /**
   * Возвращает постоянный ID группы для ручной проверки calendar-ссылки.
   */
  @Get('group-id/:groupName')
  @Version('1')
  @ApiExcludeEndpoint()
  @OnlyDev()
  async getGroupId(@Param('groupName') groupName: string) {
    const group = await this.scheduleService.getGroupIdByName(groupName);
    if (!group) {
      throw new NotFoundException('Group not found by this name');
    }
    return group;
  }
}
