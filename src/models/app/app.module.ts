import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import * as xEnv from '@my-environment';

import {
  OAuth2AccessTokenGuard,
  RATE_LIMIT,
  ThrottlerBehindProxyGuard,
} from '@my-common';

import { CalendarModule } from '../calendar/calendar.module';
import { MetricsModule } from '../metrics/metrics.module';
import { OAuthServerModule } from '../oauth-server/oauth-server.module';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { ScheduleModule } from '../schedule/schedule.module';

import { AppController } from './app.controller';

// * Разрешить доступ к методам, которые не трубуют глобальной авторизации
OAuth2AccessTokenGuard.allowNoAuth = true;

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        storage: new ThrottlerStorageRedisService(redisService.redisThrottler),
        throttlers: [RATE_LIMIT.GLOBAL],
      }),
    }),
    MetricsModule.forRoot(),
    RedisModule,
    OAuthServerModule,
    // Единственное подключение к БД: сущности регистрируются feature-модулями.
    TypeOrmModule.forRoot({
      ...xEnv.TYPEORM_CONFIG,
      autoLoadEntities: true,
    }),
    ScheduleModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: OAuth2AccessTokenGuard },
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
})
export class AppModule {}
