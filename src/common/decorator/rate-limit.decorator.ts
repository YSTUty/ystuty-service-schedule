import { Throttle } from '@nestjs/throttler';

import { RATE_LIMIT } from '@my-common/constant';

export const RateLimitPublicRead = () =>
  Throttle({
    default: {
      ttl: RATE_LIMIT.PUBLIC_READ.ttl,
      limit: RATE_LIMIT.PUBLIC_READ.limit,
    },
  });

export const RateLimitHeavyRead = () =>
  Throttle({
    default: {
      ttl: RATE_LIMIT.HEAVY_READ.ttl,
      limit: RATE_LIMIT.HEAVY_READ.limit,
    },
  });

export const RateLimitPrivateLookup = () =>
  Throttle({
    default: {
      ttl: RATE_LIMIT.PRIVATE_LOOKUP.ttl,
      limit: RATE_LIMIT.PRIVATE_LOOKUP.limit,
    },
  });
