import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import * as xEnv from '@my-environment';

import { OAuthServerService } from './oauth-server.service';
import { AccessTokenStrategy } from './strategy/access-token.strategy';

const strategies = [AccessTokenStrategy];

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MS_OAUTH_SERVER',
        transport: Transport.TCP,
        options: {
          port: xEnv.MS_OAUTH_SERVER_PORT,
          host: xEnv.MS_OAUTH_SERVER_HOST,
        },
      },
    ]),
  ],
  controllers: [],
  providers: [OAuthServerService, ...strategies],
  exports: [OAuthServerService, ...strategies],
})
export class OAuthServerModule {}
