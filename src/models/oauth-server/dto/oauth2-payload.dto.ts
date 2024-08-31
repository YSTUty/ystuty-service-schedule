import { Expose, Type } from 'class-transformer';
import { ValidateIf } from 'class-validator';

import { IOAuth2Payload, OAuth2PayloadType } from '@my-interfaces';
import { TransformToClass } from '@my-common';

import { OAuthAccessTokenResponseDto as AccessToken } from './oauth-access-token-response.dto';

/**
 * Represents a client payload
 */
export class ClientPayloadDto
  extends TransformToClass<ClientPayloadDto>
  implements IOAuth2Payload
{
  public readonly type = OAuth2PayloadType.CLIENT;

  @Type(() => AccessToken)
  public readonly accessToken: AccessToken;
}

/**
 * Represents a user payload
 */
export class UserPayloadDto<U = { [key: string]: any }>
  extends TransformToClass<UserPayloadDto>
  implements IOAuth2Payload
{
  public readonly type = OAuth2PayloadType.USER;

  @Type(() => AccessToken)
  public readonly accessToken: AccessToken;

  public readonly userId: number;
  public readonly user: { userId: number } & U;
}

export class UserOrClientPayloadDto<U = { [key: string]: any }>
  extends TransformToClass<UserOrClientPayloadDto>
  implements IOAuth2Payload
{
  @Expose()
  public readonly type: OAuth2PayloadType;

  @Type(() => AccessToken)
  public readonly accessToken: AccessToken;

  @Expose()
  @ValidateIf((o: UserOrClientPayloadDto) => o.type === OAuth2PayloadType.USER)
  public readonly userId: number;

  @Expose()
  @ValidateIf((o: UserOrClientPayloadDto) => o.type === OAuth2PayloadType.USER)
  public readonly user: { userId: number } & U;
}
