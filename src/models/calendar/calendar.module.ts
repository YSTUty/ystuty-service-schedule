import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import * as xEnv from '@my-environment';

import { ScheduleModule } from '../schedule/schedule.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [
    ScheduleModule.register(),
    ThrottlerModule.forRoot([
      {
        ttl: 20e3,
        limit: 5,
      },
    ]),
  ],
})
export class CalendarModule {
  static register() {
    return {
      module: CalendarModule,
      ...(xEnv.TYPEORM_CONFIG.host && {
        controllers: [CalendarController],
        providers: [CalendarService],
      }),
    };
  }
}
