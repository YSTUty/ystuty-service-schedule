import { Logger } from '@nestjs/common';

import * as Redlock from 'redlock';
import { Redis } from 'ioredis';

import { RedisService } from './redis.service';

jest.mock('ioredis', () => ({
  Redis: jest.fn(),
}));
jest.mock('redlock', () => jest.fn());

const redisConstructor = Redis as unknown as jest.Mock;
const redlockConstructor = Redlock as unknown as jest.Mock;
const redisClient = {
  connect: jest.fn(),
  on: jest.fn(),
  status: 'wait',
};
const redlockClient = { on: jest.fn() };

describe('RedisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.status = 'wait';
    redisConstructor.mockImplementation(() => redisClient);
    redlockConstructor.mockImplementation(() => redlockClient);
  });

  it('connects the lazy Redis client during module initialization', async () => {
    const service = new RedisService();

    await service.onModuleInit();

    expect(redisConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      }),
    );
    expect(redisClient.connect).toHaveBeenCalledTimes(1);
  });

  it('logs but suppresses the initial connection error', async () => {
    const service = new RedisService();
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    redisClient.connect.mockRejectedValueOnce(
      new Error('Redis is unavailable'),
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalledWith(
      'Redis initial connection failed: Redis is unavailable',
      expect.any(String),
    );
  });
});
