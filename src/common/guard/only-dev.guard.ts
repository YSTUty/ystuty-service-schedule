import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as xEnv from '@my-environment';
import { IS_ONLY_DEV } from '@my-common';

@Injectable()
export class OnlyDevGuard implements CanActivate {
  constructor(private readonly reflector?: Reflector) {
    this.reflector ??= new Reflector();
  }

  async canActivate(context: ExecutionContext) {
    const [isOnlyDev, checkIt] = this.reflector.getAllAndMerge<
      [boolean, ((req: Request) => boolean | Promise<boolean>) | undefined]
    >(IS_ONLY_DEV, [context.getHandler(), context.getClass()]);

    const req = context.switchToHttp().getRequest<Request>();

    if (isOnlyDev && xEnv.NODE_ENV !== xEnv.EnvType.DEV) {
      if (typeof checkIt === 'function' && (await checkIt(req)) === true) {
        return true;
      }
      throw new ForbiddenException('There is no access to the method');
    }

    return true;
  }
}
