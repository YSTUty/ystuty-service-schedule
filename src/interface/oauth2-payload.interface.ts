import { OAuthAccessTokenResponseDto as AccessToken } from '../models/oauth-server/dto/oauth-access-token-response.dto';

export enum OAuth2PayloadType {
  CLIENT = 'client',
  USER = 'user',
}

/**
 * User payloads are used in the guard when the user still finish
 */
export interface IOAuth2Payload {
  readonly type: OAuth2PayloadType;

  readonly accessToken: AccessToken;
}
