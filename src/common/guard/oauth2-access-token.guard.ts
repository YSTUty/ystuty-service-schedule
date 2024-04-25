import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY, OAUTH2_REQUIRED_SCOPES } from '@my-common';
import { IOAuth2Payload } from '@my-interfaces';

@Injectable()
export class OAuth2AccessTokenGuard extends AuthGuard('oauth2-access-token') {
  constructor(private readonly reflector: Reflector) {
    super({ property: 'oAuth' });
  }

  async canActivate(context: ExecutionContext) {
    let isPublic = this.reflector.get(IS_PUBLIC_KEY, context.getHandler());
    const requiredScopesByHandler =
      this.reflector.get<string[]>(
        OAUTH2_REQUIRED_SCOPES,
        context.getHandler(),
      ) || [];
    const requiredScopesByClass =
      this.reflector.get<string[]>(
        OAUTH2_REQUIRED_SCOPES,
        context.getClass(),
      ) || [];

    let isAllowed = true;
    try {
      isAllowed = (await super.canActivate(context)) as boolean;
    } catch (err) {
      if (!isPublic || !(err instanceof NotFoundException)) {
        if (err instanceof NotFoundException) {
          throw new ForbiddenException('Wrong access_token');
        }
        throw err;
      }
      return isAllowed;
    }

    if (isAllowed) {
      const { accessToken } = context.switchToHttp().getRequest()
        .oAuth as IOAuth2Payload;

      isAllowed = [
        ...new Set([...requiredScopesByClass, ...requiredScopesByHandler]),
      ].every((scope) => accessToken.scopes.includes(scope));
    }

    return isAllowed;
  }

  handleRequest(err, user) {
    if (err || !user) {
      throw err || new NotFoundException();
    }
    return user;
  }
}
