import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import * as Redlock from 'redlock';
import { Redis } from 'ioredis';

import * as xEnv from '@my-environment';

function createRetryStrategy() {
  return (times: number): number => {
    if (times <= 5) {
      return times * 1e3;
    }

    return 10e3;
  };
}

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);

  public readonly redis: Redis;
  public readonly redisThrottler: Redis;
  public readonly redlock: Redlock;

  constructor() {
    this.redis = new Redis({
      ...xEnv.REDIS_CONFIG,

      retryStrategy: createRetryStrategy(),
      // Подключаемся явно в onModuleInit, чтобы обработать начальную ошибку.
      lazyConnect: true,
      // Кэш не должен удерживать HTTP-запрос во время повторного подключения.
      maxRetriesPerRequest: 1, // ограничивает retry на уровне команд
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`, error.stack);
    });
    this.redis.on('connect', () => {
      this.logger.log('Redis → connected');
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

    this.redisThrottler = new Redis({
      ...xEnv.REDIS_CONFIG,
      keyPrefix: [xEnv.REDIS_CONFIG.keyPrefix, 'throttler:']
        .filter(Boolean)
        .join(''),

      retryStrategy: createRetryStrategy(),
      // Guard быстро перейдёт в fail-open, если Redis недоступен.
      lazyConnect: true,
      maxRetriesPerRequest: 1, // ограничивает retry на уровне команд
    });
    this.redisThrottler.on('error', (error) => {
      this.logger.error(
        `Redis(throttler) error: ${error.message}`,
        error.stack,
      );
    });
    this.redisThrottler.on('connect', () => {
      this.logger.log('Redis(throttler) → connected');
    });
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.connectClient(this.redis, 'Redis'),
      this.connectClient(this.redisThrottler, 'Redis(throttler)'),
    ]);
  }

  /**
   * Запускает lazy Redis-клиент, не останавливая bootstrap при недоступности.
   */
  private async connectClient(client: Redis, name: string): Promise<void> {
    const isConnected = ['connecting', 'connect', 'ready'].includes(
      client.status,
    );
    if (isConnected) return;

    try {
      await client.connect();
    } catch (error) {
      const connectionError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `${name} initial connection failed: ${connectionError.message}`,
        connectionError.stack,
      );
    }
  }
}
