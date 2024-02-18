import { Module } from '@nestjs/common';

import { AppController } from './app.controller';

import { OAuthServerModule } from '../oauth-server/oauth-server.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [OAuthServerModule, ScheduleModule.register()],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
