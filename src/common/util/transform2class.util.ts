import {
  ClassConstructor,
  ClassTransformOptions,
  plainToClass,
} from 'class-transformer';

export class TransformToClass<T extends object = ClassConstructor<any>> {
  constructor(input?: Partial<T>, options?: ClassTransformOptions) {
    transformToClass(this, input, options);
  }
}

export function transformToClass<T extends object, V = Partial<T>>(
  instance: T,
  input?: V,
  options?: ClassTransformOptions,
) {
  if (input) {
    const target = Object.getPrototypeOf(instance)
      .constructor as ClassConstructor<T>;
    Object.assign(
      instance,
      plainToClass<T, V>(target, input, {
        enableImplicitConversion: true,
        enableCircularCheck: true,
        ...options,
      }),
    );
  }
}
