import { Transform, Readable } from 'stream';

type TransformOptions = ConstructorParameters<typeof Transform>[0];

export const filter = <T>(
  predicate: (value: T) => boolean | Promise<boolean>,
  options: TransformOptions = { objectMode: true }
): Transform => {
  return new Transform({
    ...options,

    async transform(chunk, _encoding, callback) {
      const keep = await predicate(chunk);

      callback(null, keep ? chunk : undefined);
    },
  });
};

export const map = <T>(
  predicate: (value: T) => T | Promise<T>,
  options: TransformOptions = { objectMode: true }
): Transform => {
  return new Transform({
    ...options,

    async transform(chunk, _encoding, callback) {
      const mappedValue = await predicate(chunk);

      callback(null, mappedValue);
    },
  });
};

/**
 * Collect every entity in a Readable stream
 */
export const collect = <T = unknown>(stream: Readable): Promise<T[]> => {
  const chunks: T[] = [];

  return new Promise((resolve) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      stream.destroy();
      resolve(chunks);
    });
  });
};
