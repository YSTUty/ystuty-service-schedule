import {
  HttpException,
  HttpExceptionOptions,
  HttpStatus,
} from '@nestjs/common';

/**
 * @publicApi
 */
export class HttpRpcException extends HttpException {
  constructor(private readonly error: Record<string, any> | Error) {
    let response: any;
    let status: number;
    let options: HttpExceptionOptions;

    // || 'syscall' in error
    if (!error || error instanceof Error || !(error.statusCode || error.code)) {
      response = 'Internal Server Error' /* error.message */;
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      if (error instanceof Error) {
        options = { cause: error };
      }
      console.log({ error, response, status, options });
    } else {
      response = HttpException.createBody(error);
      status = Number(error?.statusCode || error?.code);
      if (status < 100 || status > 600) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }

    super(response, status, options);
  }

  public getStatus(): number {
    const error = this.getError();
    return (
      (!(error instanceof Error) && (error?.statusCode || error?.code)) ||
      super.getStatus()
    );
  }

  public getError() {
    return this.error;
  }
}
