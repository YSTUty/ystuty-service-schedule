import { Controller, Get, Version } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';

import { OnlyDev, RateLimitHeavyRead } from '@my-common';

import { ScheduleLessonTypeDiagnosticsService } from './schedule-lesson-type-diagnostics.service';

@ApiTags('schedule')
@Controller('/schedule/debug')
export class ScheduleDiagnosticsController {
  constructor(
    private readonly diagnosticsService: ScheduleLessonTypeDiagnosticsService,
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
}
