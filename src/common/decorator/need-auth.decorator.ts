import { SetMetadata } from '@nestjs/common';

export const NEED_AUTH_KEY = 'needAuth';

/**
 * Need authorization
 *
 * Use it if `OAuth2AccessTokenGuard.allowNoAuth = true;`
 */
export const NeedAuth = () => SetMetadata(NEED_AUTH_KEY, true);
