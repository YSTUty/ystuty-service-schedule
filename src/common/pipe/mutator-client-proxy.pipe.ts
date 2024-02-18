import { RequestTimeoutException } from '@nestjs/common';
import * as rxjs from 'rxjs';
import { HttpRpcException } from '../exception/http-rpc-exception';

export const mutatorClientProxy = <T = any>(
  source: new (...args: any[]) => T,
): [rxjs.OperatorFunction<T, T>] =>
  [
    rxjs.timeout<T>(4e3),
    rxjs.catchError((err) =>
      rxjs.throwError(() =>
        err instanceof rxjs.TimeoutError
          ? new RequestTimeoutException()
          : new HttpRpcException(err),
      ),
    ) as rxjs.OperatorFunction<Partial<T>, Partial<T>>,
    rxjs.map((e: Partial<T>) => {
      if (
        typeof e === 'object' &&
        'error' in e &&
        'status' in e &&
        e.status === 'error'
      ) {
        throw new HttpRpcException(e);
      }
      return (e && new source(e)) || e;
    }),
    rxjs.defaultIfEmpty<T, null>(null),
  ] as any;
