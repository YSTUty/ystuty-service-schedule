import { UnauthorizedException } from '@nestjs/common';

import { CalDavBasicAuthGuard } from './caldav-basic-auth.guard';

describe('CalDavBasicAuthGuard', () => {
  const createContext = (authorization?: string) => {
    const res = { setHeader: jest.fn() };
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization },
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
