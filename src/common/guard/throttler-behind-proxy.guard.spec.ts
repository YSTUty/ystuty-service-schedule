import { Logger } from '@nestjs/common';

import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard';

describe('ThrottlerBehindProxyGuard', () => {
  it('allows the request when Redis rate-limit storage is unavailable', async () => {
    const storage = {
      increment: jest.fn().mockRejectedValue(new Error('Redis is unavailable')),
    };
    const reflector = {
      getAllAndOverride: jest.fn(),
    };
    const guard = new ThrottlerBehindProxyGuard(
      {
        throttlers: [{ ttl: 1_000, limit: 1 }],
      },
      storage as any,
      reflector as any,
    );
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const context = {
      getClass: () => ThrottlerBehindProxyGuard,
      getHandler: () => () => undefined,
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, ip: '127.0.0.1' }),
        getResponse: () => ({ header: jest.fn() }),
      }),
    };

    await guard.onModuleInit();

    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(loggerError).toHaveBeenCalledWith(
      'Rate limit storage error; allowing request: Redis is unavailable',
      expect.any(String),
    );
  });
});
