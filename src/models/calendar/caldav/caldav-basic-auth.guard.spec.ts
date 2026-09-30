import { UnauthorizedException } from '@nestjs/common';

import { CalDavBasicAuthGuard } from './caldav-basic-auth.guard';

describe('CalDavBasicAuthGuard', () => {
  const createContext = (
    authorization?: string,
    method = 'GET',
    headers: Record<string, string | undefined> = {},
  ) => {
    const res = { setHeader: jest.fn() };
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization, ...headers },
          method,
          params: { groupName: 'ЦИС-16' },
        }),
        getResponse: () => res,
      }),
      res,
    };
  };

  it('accepts any non-empty Basic username', () => {
    const context = createContext(
      `Basic ${Buffer.from('caldav-user:any-password').toString('base64')}`,
    );

    expect(new CalDavBasicAuthGuard().canActivate(context as any)).toBeTruthy();
  });

  it('challenges unauthenticated OPTIONS so a CalDAV client can retry with Basic Auth', () => {
    const context = createContext(undefined, 'OPTIONS');

    expect(() =>
      new CalDavBasicAuthGuard().canActivate(context as any),
    ).toThrow(UnauthorizedException);
    expect(context.res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="YSTUty Calendar", charset="UTF-8"',
    );
  });

  it('allows an unauthenticated browser CORS preflight', () => {
    const context = createContext(undefined, 'OPTIONS', {
      'access-control-request-method': 'REPORT',
      origin: 'https://example.test',
    });

    expect(new CalDavBasicAuthGuard().canActivate(context as any)).toBeTruthy();
    expect(context.res.setHeader).not.toHaveBeenCalled();
  });

  it('challenges a request without valid Basic authorization', () => {
    const context = createContext();

    expect(() =>
      new CalDavBasicAuthGuard().canActivate(context as any),
    ).toThrow(UnauthorizedException);
    expect(context.res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="YSTUty Calendar", charset="UTF-8"',
    );
  });
});
