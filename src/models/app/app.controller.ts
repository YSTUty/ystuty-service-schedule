import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import {
  ApiErrorResponses,
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

import { UptimeResponseDto } from './dto/app-response.dto';

@ApiTags('system')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class AppController {
  public readonly timeStart = Date.now();

  @Get('uptime')
  @SkipThrottle()
  @ApiOperation({ summary: 'Проверить, что HTTP-процесс запущен' })
  @ApiResponse({ status: HttpStatus.OK, type: UptimeResponseDto })
  @SerializeOptions({
    type: UptimeResponseDto,
    excludeExtraneousValues: true,
  })
  getTime() {
    return { uptime: Date.now() - this.timeStart };
  }

  @Get('getMyGroup')
  @RateLimitPrivateLookup()
  @NeedAuth()
  @OAuth2RequiredScope('schedule', ['user'])
  @ApiOperation({
    summary: 'Вернуть группу студента из профиля OAuth-пользователя',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Название группы или null, если оно отсутствует в профиле',
    schema: { type: 'string', nullable: true, example: 'ЦИС-37' },
  })
  @ApiErrorResponses(
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
  )
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
