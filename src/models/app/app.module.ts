import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { ThrottlerBehindProxyGuard } from '@my-common';

import { AppController } from './app.controller';

import { OAuthServerModule } from '../oauth-server/oauth-server.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { RedisModule } from '../redis/redis.module';

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
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
