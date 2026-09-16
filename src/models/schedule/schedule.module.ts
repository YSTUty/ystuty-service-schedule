import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import * as entities from './entity';
import { ScheduleDiagnosticsController } from './diagnostics/schedule-diagnostics.controller';
import { ScheduleLessonTypeDiagnosticsService } from './diagnostics/schedule-lesson-type-diagnostics.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [TypeOrmModule.forFeature([...Object.values(entities)])],
  controllers: [ScheduleController, ScheduleDiagnosticsController],
  providers: [ScheduleService, ScheduleLessonTypeDiagnosticsService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
