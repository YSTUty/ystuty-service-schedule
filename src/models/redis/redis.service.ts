import { Injectable, Logger } from '@nestjs/common';

import * as Redlock from 'redlock';
import { Redis } from 'ioredis';

import * as xEnv from '@my-environment';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  public readonly redis: Redis;
  public readonly redlock: Redlock;

  constructor() {
    this.redis = new Redis(xEnv.REDIS_PORT, xEnv.REDIS_HOST, {
      db: xEnv.REDIS_DATABASE,
      username: xEnv.REDIS_USER,
      password: xEnv.REDIS_PASSWORD,
      keyPrefix: xEnv.REDIS_PREFIX,
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`, error.stack);
    });
    this.redis.on('connect', () => {
      this.logger.log(`Redis → connected`);
    });
    this.redis.on('reconnecting', (delay: number) => {
      this.logger.warn(
        `Redis reconnecting in ${delay} ms (attempt ${this.redis.status})`,
      );
    });

    this.redlock = new Redlock([this.redis as any]);
    this.redlock.on('clientError', (error) => {
      this.logger.error(`Redlock error: ${error.message}`, error.stack);
    });
  }
}
