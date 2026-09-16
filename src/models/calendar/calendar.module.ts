import { Module } from '@nestjs/common';

import { ScheduleModule } from '../schedule/schedule.module';

import { CalDavBasicAuthGuard } from './caldav/caldav-basic-auth.guard';
import { CalDavController } from './caldav/caldav.controller';
import { CalDavService } from './caldav/caldav.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [ScheduleModule],
  controllers: [CalendarController, CalDavController],
  providers: [CalendarService, CalDavBasicAuthGuard, CalDavService],
})
export class CalendarModule {}
