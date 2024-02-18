import {
  HttpStatus,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import * as rxjs from 'rxjs';
import { Response } from 'express';
import { HttpRpcException } from '../exception/http-rpc-exception';
import { RpcException } from '@nestjs/microservices';

/**
 * Универсальный фильр ошибок для ответа на HTTP или RPC
 */
@Catch()
export class HttpAndRpcExceptionFilter implements ExceptionFilter {
  catch(exception: Error | HttpRpcException, host: ArgumentsHost) {
    if (host.getType() !== 'http' && host.getType() !== 'rpc') {
      return exception;
    }

    let expResponse: string | Record<string, any> = null;
    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let { message } = exception;
    let errorName: string;

    if (exception instanceof HttpException) {
      code = exception.getStatus?.();
      expResponse = exception.getResponse?.() as string | any;
    } else if (exception instanceof RpcException) {
      expResponse = exception.getError();
      // isObject(expResponse) && 'error' in expResponse
      // message = undefined;
    } else if (exception instanceof HttpRpcException) {
      expResponse = exception.getError();
      code = exception.getStatus();
    } else {
      message = undefined;
    }

    code ??= HttpStatus.INTERNAL_SERVER_ERROR;

    let payload: any;
    let validation: any;
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

    host.switchToHttp().getResponse<Response>().status(code).json({ error });
  }
}
