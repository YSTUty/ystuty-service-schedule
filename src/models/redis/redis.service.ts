import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import * as Redlock from 'redlock';
import * as xEnv from '@my-environment';

@Injectable()
export class RedisService {
  public readonly redis: Redis.Redis;
  public readonly redlock: Redlock;

  constructor() {
    this.redis = new Redis(xEnv.REDIS_PORT, xEnv.REDIS_HOST, {
      db: xEnv.REDIS_DATABASE,
      username: xEnv.REDIS_USER,
      password: xEnv.REDIS_PASSWORD,
      keyPrefix: xEnv.REDIS_PREFIX,
    });

    this.redlock = new Redlock([this.redis]);
  }
}
