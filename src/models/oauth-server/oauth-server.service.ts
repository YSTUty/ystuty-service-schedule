import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as rxjs from 'rxjs';

import * as xEnv from '@my-environment';
import { mutatorClientProxy } from '@my-common';

import { UserOrClientPayloadDto } from './dto/oauth2-payload.dto';

@Injectable()
export class OAuthServerService {
  @Inject('MS_OAUTH_SERVER')
  private readonly oAuthServerClient: ClientProxy;

  async checkAccessToken(accessToken: string) {
    const result = await rxjs.firstValueFrom(
      this.oAuthServerClient
        .send(
          { entity: 'oauth', method: 'checkAccessToken' },
          {
            clientId: xEnv.OAUTH_CLIENT_ID,
            clientSecret: xEnv.OAUTH_CLIENT_SECRET,
            accessToken,
            serviceToken: xEnv.OAUTH_SERVER_SERVICE_TOKEN,
          },
        )
        .pipe(...mutatorClientProxy(UserOrClientPayloadDto)),
    );

    return result;
  }
}
