import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export const IS_ONLY_DEV = 'isOnlyDev';

/**
 * Allow access to the method only in development mode
 */
export const OnlyDev = (
  checkId?: (req: Request) => boolean | Promise<boolean>,
) => SetMetadata(IS_ONLY_DEV, [true, checkId] as const);
