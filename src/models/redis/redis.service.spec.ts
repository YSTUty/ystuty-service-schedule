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
const redlockClient = { on: jest.fn() };

describe('RedisService', () => {
  let redisClient: {
    connect: jest.Mock;
    on: jest.Mock;
    status: string;
  };
  let redisThrottlerClient: {
    connect: jest.Mock;
    on: jest.Mock;
    status: string;
  };

  beforeEach(() => {
    redisClient = {
      connect: jest.fn(),
      on: jest.fn(),
      status: 'wait',
    };
    redisThrottlerClient = {
      connect: jest.fn(),
      on: jest.fn(),
      status: 'wait',
    };
    redisConstructor
      .mockReset()
      .mockImplementationOnce(() => redisClient)
      .mockImplementationOnce(() => redisThrottlerClient);
    redlockConstructor.mockReset().mockImplementation(() => redlockClient);
  });

  it('connects the lazy Redis clients during module initialization', async () => {
    const service = new RedisService();

    await service.onModuleInit();

    expect(redisConstructor).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      }),
    );
    expect(redisConstructor).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        keyPrefix: expect.stringContaining('throttler:'),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      }),
    );
    expect(redisClient.connect).toHaveBeenCalledTimes(1);
    expect(redisThrottlerClient.connect).toHaveBeenCalledTimes(1);
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
