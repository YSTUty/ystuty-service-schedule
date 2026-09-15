import { DECORATORS, SecurityRequirementObject } from '@nestjs/swagger';

import { extendMetadata } from '../util/extend-metadata.util';

export const ApiAllSecurity = (
  scopes: string[] = [],
): ClassDecorator & MethodDecorator => {
  const names = ['oauth2', 'access_token', 'bearer'];
  let metadata: SecurityRequirementObject[] = names.map((name) => ({
    [name]: scopes,
  }));

  return (
    target: object,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    if (descriptor) {
      metadata = extendMetadata(
        metadata,
        DECORATORS.API_SECURITY,
        descriptor.value,
      );
      Reflect.defineMetadata(
        DECORATORS.API_SECURITY,
        metadata,
        descriptor.value,
      );
      return descriptor;
    }

    metadata = extendMetadata(metadata, DECORATORS.API_SECURITY, target);
    Reflect.defineMetadata(DECORATORS.API_SECURITY, metadata, target);
    return target;
  };
};
