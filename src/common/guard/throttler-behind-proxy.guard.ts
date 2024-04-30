import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
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
}
