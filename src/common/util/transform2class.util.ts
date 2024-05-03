import {
  ClassConstructor,
  ClassTransformOptions,
  plainToClass,
} from 'class-transformer';

export class TransformToClass<T = ClassConstructor<any>> {
  constructor(input?: Partial<T>, options?: ClassTransformOptions) {
    transformToClass(this, input, options);
  }
}

export function transformToClass<T, V = Partial<T>>(
  instance: T,
  input?: V,
  options?: ClassTransformOptions,
) {
  if (input) {
    Object.assign(
      instance,
      plainToClass<T, V>(instance.constructor as ClassConstructor<T>, input, {
        enableImplicitConversion: true,
        enableCircularCheck: true,
        ...options,
      }),
    );
  }
}
