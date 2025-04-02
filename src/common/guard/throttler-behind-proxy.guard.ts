import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';
import { IOAuth2Payload } from '@my-interfaces';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ips.length ? req.ips[0] : req.ip; // individualize IP extraction to meet your own needs
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const oAuth = context.switchToHttp().getRequest().oAuth as IOAuth2Payload;

    if (oAuth && oAuth.accessToken) {
      const { accessToken } = oAuth;
      if (accessToken.scopes.includes('schedule:nolimit')) {
        return true;
      }
    }

    return false;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ) {
    const { limit, totalHits, timeToExpire /* ttl, timeToBlockExpire */ } =
      throttlerLimitDetail;
    const { res } = this.getRequestResponse(context);

    // !
    const throttler = { name: 'default' };

    const getThrottlerSuffix = (name: string) =>
      name === 'default' ? '' : `-${name}`;

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
      // timeToExpire + Math.ceil(ttl / 1e3),
    );

    throw new ThrottlerException(
      await this.getErrorMessage(context, throttlerLimitDetail),
    );
  }
}
