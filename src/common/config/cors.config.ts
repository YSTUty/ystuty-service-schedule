import { Request } from 'express';

/**
 * CalDAV-клиент использует OPTIONS как протокольный запрос, а не CORS preflight.
 * Поэтому такие маршруты нужно пропустить до контроллера, сохранив CORS-заголовки.
 */
export const getCorsOptions = (req: Request) => ({
  allowedHeaders: ['content-type', 'authorization'],
  exposedHeaders: [
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'retry-after',
  ],
  preflightContinue: req.path.startsWith('/v1/calendar/caldav/'),
});
