import { plainToInstance } from 'class-transformer';

import { IOAuth2Payload, OAuth2PayloadType } from '@my-interfaces';
// import { User } from './entity/user.entity';
import { OAuthAccessTokenResponseDto as AccessToken } from './oauth-access-token-response.dto';

/**
 * Represents a client payload
 */
export class ClientPayloadDto implements IOAuth2Payload {
  public readonly type = OAuth2PayloadType.CLIENT;

  public readonly accessToken: AccessToken;

  constructor(input?: Partial<ClientPayloadDto>) {
    if (input) {
      Object.assign(this, plainToInstance(ClientPayloadDto, input));
    }
  }
}

/**
 * Represents a user payload
 */
export class UserPayloadDto<U = { [key: string]: any }>
  implements IOAuth2Payload
{
  public readonly type = OAuth2PayloadType.USER;

  public readonly accessToken: AccessToken;

  public readonly userId: number;
  public readonly user: { userId: number } & U;

  constructor(input?: Partial<UserPayloadDto>) {
    if (input) {
      Object.assign(this, plainToInstance(UserPayloadDto, input));
    }
  }
}
