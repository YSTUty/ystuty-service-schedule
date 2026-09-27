import { getCorsOptions } from './cors.config';

describe('getCorsOptions', () => {
  it('forwards CalDAV OPTIONS to the Nest controller', () => {
    expect(
      getCorsOptions({
        path: '/v1/calendar/caldav/group-id/4627',
      } as any).preflightContinue,
    ).toBe(true);
  });

  it('keeps automatic CORS preflight handling for regular API routes', () => {
    expect(
      getCorsOptions({
        path: '/v1/schedule/actual_groups',
      } as any).preflightContinue,
    ).toBe(false);
  });
});
