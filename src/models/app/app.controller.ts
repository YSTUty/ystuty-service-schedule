import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOAuth2 } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import {
  NeedAuth,
  OAuth2RequiredScope,
  RateLimitPrivateLookup,
  ReqAuth,
  ReqAuthType,
} from '@my-common';
import { OAuth2PayloadType } from '@my-interfaces';

import {
  ClientPayloadDto,
  UserPayloadDto,
} from '../oauth-server/dto/oauth2-payload.dto';

@Controller()
export class AppController {
  public readonly timeStart = Date.now();

  @Get('uptime')
  @SkipThrottle()
  getTime() {
    return { uptime: Date.now() - this.timeStart };
  }

  @Get('getMyGroup')
  @RateLimitPrivateLookup()
  @ApiBearerAuth() /* (http, Bearer) */
  @ApiOAuth2([]) /* (OAuth2, clientCredentials) */
  @NeedAuth()
  @OAuth2RequiredScope('schedule', ['user'])
  async getMyGroup(
    @ReqAuth(ReqAuthType.OAuth) oauthPayload: UserPayloadDto | ClientPayloadDto,
  ) {
    // console.log('oauthPayload', oauthPayload);
    if (oauthPayload.type === OAuth2PayloadType.CLIENT) {
      return null;
    }

    /*
      SELECT TOP (1)
        [idgroup]
        ,[namegroup]
        ,[namespec]
      FROM [wrasp].[dbo].[gruppa]
      WHERE [idgroup] = 5072191
    */

    /*
      SELECT TOP (1)
          [oid]
          ,[man]
          ,[gruppa]
          ,[kod_dela]
      FROM [hs].[dbo].[profile]
      WHERE [oid] = {userId}
    */

    return oauthPayload.user?.studData?.groupName || null;
  }
}
