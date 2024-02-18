import { createHash } from 'crypto';

export const md5 = (str: string) => createHash('md5').update(str).digest('hex');

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// export * from './constants';
export * from './decorator';
export * from './exception';
export * from './filter';
export * from './guard';
export * from './pipe';
export * from './util';
