import { Module } from '@nestjs/common';

import { ScheduleModule } from '../schedule/schedule.module';

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [ScheduleModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
