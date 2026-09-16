import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';

import { Request } from 'express';

import { IOAuth2Payload } from '@my-interfaces';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ThrottlerBehindProxyGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw error;
      }

      const storageError =
        error instanceof Error ? error : new Error(String(error));
      // Redis недоступен: не делаем API полностью недоступным из-за rate limit.
      this.logger.error(
        `Rate limit storage error; allowing request: ${storageError.message}`,
        storageError.stack,
      );
      return true;
    }
  }

  protected async getTracker(
    req: Request & { oAuth?: IOAuth2Payload },
  ): Promise<string> {
    const accessToken = req.oAuth?.accessToken;
    if (accessToken && !accessToken.isRevoked) {
      if (accessToken.userId) {
        return `user:${accessToken.userId}`;
      }
      if (accessToken.id) {
        return `accessToken:${accessToken.id}`;
      }
    }
    // req.ip учитывает только proxy из TRUSTED_PROXY_IPS, настроенных в main.ts.
    const ip = (req.ip || req.socket?.remoteAddress || 'unknown').replace(
      /:/g,
      '-',
    );
    return `ip:${ip}`;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const accessToken = context
      .switchToHttp()
      .getRequest<{ oAuth?: IOAuth2Payload }>().oAuth?.accessToken;
    if (accessToken && !accessToken.isRevoked) {
      if (accessToken.scopes.includes('schedule:nolimit')) {
        return true;
      }
    }

    return false;
  }

  protected generateKey(
    ctx: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const prefix = `${ctx.getClass().name}-${ctx.getHandler().name}-${name}`;
    return /* hash.sha256 */ `${prefix}-${suffix}`;
  }

  /**
   * Явно возвращает rate limit headers в ответе 429.
   *
   * Сейчас сервис использует только throttler с именем `default`.
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { limit, totalHits, timeToExpire, timeToBlockExpire } =
      throttlerLimitDetail;
    const { res } = this.getRequestResponse(context);

    // !TODO need getting correct throttler options
    const throttler = { name: 'default', setHeaders: true };

    const getThrottlerSuffix = (name: string) =>
      name === 'default' ? '' : `-${name}`;
    const setHeaders =
      throttler.setHeaders ?? this.commonOptions.setHeaders ?? true;

    if (setHeaders) {
      // res.header(
      //   `Retry-After${getThrottlerSuffix(throttler.name)}`,
      //   // timeToBlockExpire,
      //   timeToBlockExpire + Math.ceil(ttl / 1e3),
      // );

      res.header(
        `${this.headerPrefix}-Limit${getThrottlerSuffix(throttler.name)}`,
        limit,
      );
      // We're about to add a record so we need to take that into account here.
      // Otherwise the header says we have a request left when there are none.
      res.header(
        `${this.headerPrefix}-Remaining${getThrottlerSuffix(throttler.name)}`,
        Math.max(0, limit - totalHits),
      );
      res.header(
        `${this.headerPrefix}-Reset${getThrottlerSuffix(throttler.name)}`,
        timeToExpire,
      );
    }

    throw new ThrottlerException(
      await this.getErrorMessage(context, throttlerLimitDetail),
    );
  }
}
