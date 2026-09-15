import { Exclude, Expose } from 'class-transformer';

import { TransformToClass } from '@my-common';

@Exclude()
export class OAuthAccessTokenResponseDto extends TransformToClass<OAuthAccessTokenResponseDto> {
  @Expose()
  public id: number;

  @Expose()
  public accessToken: string;

  @Expose()
  public refreshToken: string;

  @Expose()
  public accessTokenExpiresAt: Date;

  @Expose()
  public refreshTokenExpiresAt: Date;

  @Expose()
  public isRevoked: boolean;

  @Expose()
  public revokedAt: Date;

  @Expose()
  public clientId: number;

  @Expose()
  public userId: number;

  @Expose()
  public refreshedById: number;

  @Expose()
  public scopes: string[];

  @Expose()
  public createdAt: Date;

  @Expose()
  public updatedAt: Date;
}
