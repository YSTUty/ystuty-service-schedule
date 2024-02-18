import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

import { OAuthServerService } from '../oauth-server.service';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'oauth2-access-token',
) {
  @Inject()
  private readonly oAuthServerService: OAuthServerService;

  async validate(bearer: string) {
    if (!bearer) {
      throw new ForbiddenException('Wrong access_token');
    }

    const result = await this.oAuthServerService.checkAccessToken(bearer);
    if (!result) {
      throw new ForbiddenException('Wrong access_token');
    }

    return result;
  }
}
