import { extendArrayMetadata } from '@nestjs/common/utils/extend-metadata.util';
import { OAUTH2_REQUIRED_SCOPES } from '../constant/oauth2.constants';
import { DECORATORS as swaggerDecorators } from '@nestjs/swagger/dist/constants';

/**
 * Required scopes for access
 *
 * Example:
 * `@OAuth2RequiredScope('user', ['read', 'write'])`
 * then `'user:read,user:write'`
 *
 * `@OAuth2RequiredScope('user', ['read', 'write'], ['personal', 'all'])`
 * then `'user:read:personal,user:write:personal,user:read:all,user:write:all'`
 *
 * `@OAuth2RequiredScope(['user:read', 'user:write', 'task:read'], ['personal'])`
 * then `'user:read:personal,user:write:personal,task:read:personal'`
 */
export function OAuth2RequiredScope(
  scopesWithSpace: string[],
): ClassDecorator & MethodDecorator;

export function OAuth2RequiredScope(
  space: string,
  scopes: string[],
): ClassDecorator & MethodDecorator;

export function OAuth2RequiredScope(
  scopes: string[],
  subs: string[],
): ClassDecorator & MethodDecorator;

export function OAuth2RequiredScope(
  space: string,
  scopes: string[],
  subs: string[],
): ClassDecorator & MethodDecorator;

export function OAuth2RequiredScope(
  spaceOrScopes: string | string[],
  scopesOrSubs?: string[],
  subs?: string[],
) {
  const space = Array.isArray(spaceOrScopes) ? null : spaceOrScopes;
  const scopes = Array.isArray(spaceOrScopes) ? spaceOrScopes : scopesOrSubs;
  subs ??=
    Array.isArray(spaceOrScopes) && Array.isArray(scopesOrSubs)
      ? scopesOrSubs
      : null;

  const metadataValue = scopes
    .map((e) => (space ? `${space}:${e}` : e))
    .flatMap((e) => (subs ? subs.map((s) => `${e}:${s}`) : e));
  const metadataScopes = ['oauth2', 'bearer', 'access_token'].map((e) => ({
    [e]: metadataValue,
  }));

  const decoratorFactory = (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      extendArrayMetadata(
        OAUTH2_REQUIRED_SCOPES,
        metadataValue,
        descriptor.value,
      );

      extendArrayMetadata(
        swaggerDecorators.API_SECURITY,
        metadataScopes,
        descriptor.value,
      );
      return descriptor;
    }

    extendArrayMetadata(OAUTH2_REQUIRED_SCOPES, metadataValue, target);
    extendArrayMetadata(swaggerDecorators.API_SECURITY, metadataScopes, target);
    return target;
  };
  decoratorFactory.KEY = OAUTH2_REQUIRED_SCOPES;
  return decoratorFactory;
}
