import { HttpAdapterHost } from '@nestjs/core';
import {
  HttpStatus,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as rxjs from 'rxjs';
import { Request, Response } from 'express';
import { HttpRpcException } from '../exception/http-rpc-exception';

/**
 * Универсальный фильр ошибок для ответа на HTTP или RPC
 */
@Catch()
export class HttpAndRpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpAndRpcExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: Error | HttpRpcException, host: ArgumentsHost) {
    if (host.getType() !== 'http' && host.getType() !== 'rpc') {
      // throw exception; // ?
      return;
    }

    const httpException =
      exception instanceof HttpException
        ? exception
        : new InternalServerErrorException({}, { cause: exception });

    let expResponse: string | Record<string, any> | null =
      httpException.getResponse() || null;
    let code = httpException.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | undefined = httpException.message || undefined;

    if (exception instanceof RpcException) {
      expResponse = exception.getError();
      // isObject(expResponse) && 'error' in expResponse
      // message = undefined;
    } else if (exception instanceof HttpRpcException) {
      expResponse = exception.getError();
      code = exception.getStatus();
    } else {
      // message = undefined;
    }

    let payload: any;
    let validation: any;
    let errorName: string;
    if (expResponse && typeof expResponse !== 'string') {
      payload = expResponse.payload;
      validation = expResponse.validation;
      errorName ??= expResponse.error;
    }
    errorName ??=
      exception instanceof RpcException ? 'RpcException' : exception.name;

    const error = {
      code,
      message,
      error: errorName,
      timestamp: new Date().toISOString(),
      payload,
      validation,
    };

    if (host.getType() === 'rpc') {
      return rxjs.throwError(() => ({ status: 'error', ...error }));
    }

    const { httpAdapter } = this.httpAdapterHost;
    const ctxHttp = host.switchToHttp();

    const request = ctxHttp.getRequest<Request>();
    if (code == HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${code}] ${errorName} (IP=${request.ip}) [${httpAdapter.getRequestMethod(request)}]{"${httpAdapter.getRequestUrl(request)}"}: ${exception.message}`,
        /* (httpException.cause as Error) */ exception.stack,
      );
    }

    // ctxHttp.getResponse<Response>().status(code).json({ error });
    httpAdapter.reply(ctxHttp.getResponse<Response>(), { error }, code);
  }
}
