import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Users will have access without authorization
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
