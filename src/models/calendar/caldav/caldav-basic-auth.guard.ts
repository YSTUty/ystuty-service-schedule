import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(CalDavBasicAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // CORS preflight не является CalDAV discovery и не содержит credentials.
    if (
      req.method.toUpperCase() === 'OPTIONS' &&
      req.headers.origin &&
      req.headers['access-control-request-method']
    ) {
      return true;
    }

    const credentials = this.getCredentials(req.headers.authorization);

    if (!credentials?.username) {
      // Не логируем заголовок Authorization: он может содержать Basic password.
      const userAgent = this.getSafeUserAgent(req.headers['user-agent']);
      const userAgentSuffix = userAgent
        ? `; user-agent=${JSON.stringify(userAgent)}`
        : '';
      this.logger.warn(
        `CalDAV ${req.method.toUpperCase()} [${req.originalUrl ?? req.url}] -> 401 (missing Basic Auth${userAgentSuffix})`,
      );
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

  /** Предотвращает подмену строк журналирования из заголовка User-Agent. */
  private getSafeUserAgent(
    userAgent: string | string[] | undefined,
  ): string | null {
    const value = Array.isArray(userAgent) ? userAgent[0] : userAgent;
    if (!value) {
      return null;
    }

    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 160);
  }
}
