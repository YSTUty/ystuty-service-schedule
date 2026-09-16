import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Request, Response } from 'express';

/**
 * Проверяет формальную Basic Auth для CalDAV-клиентов.
 *
 * Календарь группы остаётся публичным: имя и пароль не проверяются и нужны
 * только для совместимости клиентов. Группа выбирается по URL.
 */
@Injectable()
export class CalDavBasicAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const credentials = this.getCredentials(req.headers.authorization);

    if (!credentials?.username) {
      res.setHeader(
        'WWW-Authenticate',
        'Basic realm="YSTUty Calendar", charset="UTF-8"',
      );
      throw new UnauthorizedException('Basic authorization is required');
    }

    return true;
  }

  /**
   * Возвращает пару логин/пароль из Basic Authorization или null.
   */
  private getCredentials(
    authorization?: string,
  ): { username: string; password: string } | null {
    if (!authorization?.startsWith('Basic ')) {
      return null;
    }

    const decoded = Buffer.from(
      authorization.slice('Basic '.length),
      'base64',
    ).toString('utf8');
    const separatorPosition = decoded.indexOf(':');
    if (separatorPosition === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorPosition),
      password: decoded.slice(separatorPosition + 1),
    };
  }
}
