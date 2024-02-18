import {
  Injectable,
  PipeTransform,
  BadRequestException,
  ValidationPipe,
  ValidationError,
} from '@nestjs/common';

@Injectable()
export class ValidationHttpPipe
  extends ValidationPipe
  implements PipeTransform<any>
{
  createExceptionFactory() {
    return (validationErrors: ValidationError[] = []) => {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Arguments invalid',
        validation: validationErrors.map((err) => ({
          property: err.property,
          constraints: err.constraints,
        })),
      });
    };
  }
}
