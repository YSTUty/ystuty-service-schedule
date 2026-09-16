export const RATE_LIMIT = {
  // 40 req / 60s
  GLOBAL: { ttl: 60_000, limit: 40 },
  // 15 req / 10s
  PUBLIC_READ: { ttl: 10_000, limit: 15 },
  // 5 req / 10s - тяжёлые справочные выборки
  HEAVY_READ: { ttl: 10_000, limit: 5 },
  // 2 req / 2s - определение группы текущего пользователя
  PRIVATE_LOOKUP: { ttl: 2_000, limit: 2 },
};
