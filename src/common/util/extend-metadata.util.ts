/**
 * Extends metadata array while preserving values previously assigned by decorators.
 */
export const extendMetadata = <T>(
  metadata: T[],
  metadataKey: string,
  target: object,
): T[] => {
  const existingMetadata = Reflect.getMetadata(metadataKey, target) as T[];

  return existingMetadata ? existingMetadata.concat(metadata) : metadata;
};

/**
 * Appends metadata to an array stored under the provided key.
 */
export const extendArrayMetadata = <T>(
  metadataKey: string,
  metadata: T[],
  target: object,
): void => {
  const previousMetadata = Reflect.getMetadata(metadataKey, target) || [];

  Reflect.defineMetadata(
    metadataKey,
    [...previousMetadata, ...metadata],
    target,
  );
};
