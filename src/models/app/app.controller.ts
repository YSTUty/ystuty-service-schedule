import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOAuth2 } from '@nestjs/swagger';

import { OAuth2AccessTokenGuard, ReqAuth, ReqAuthType } from '@my-common';
import { OAuth2PayloadType } from '@my-interfaces';

import {
  UserPayloadDto,
  ClientPayloadDto,
} from '../oauth-server/dto/oauth2-payload.dto';

@Controller()
export class AppController {
  public readonly timeStart = Date.now();

  @Get('uptime')
  getTime() {
    return { uptime: Date.now() - this.timeStart };
  }

  @Get('getMyGroup')
  @UseGuards(OAuth2AccessTokenGuard)
  @ApiBearerAuth() /* (http, Bearer) */
  @ApiOAuth2([]) /* (OAuth2, clientCredentials) */
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
