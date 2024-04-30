import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { OAuth2AccessTokenGuard, ThrottlerBehindProxyGuard } from '@my-common';

import { AppController } from './app.controller';

import { OAuthServerModule } from '../oauth-server/oauth-server.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { RedisModule } from '../redis/redis.module';
import { CalendarModule } from '../calendar/calendar.module';

// * Разрешить доступ к методам, которые не трубуют глобальной авторизации
OAuth2AccessTokenGuard.allowNoAuth = true;

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 10e3,
        limit: 5,
      },
    ]),
    RedisModule,
    OAuthServerModule,
    ScheduleModule.register(),
    CalendarModule.register(),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OAuth2AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
