import { Transform, Readable } from 'stream';

type TransformOptions = ConstructorParameters<typeof Transform>[0];

/**
 * Create a filter stream that discard chunks which doesn't satisfies the given predicate
 *
 * @param predicate - A filter predicate, takes a stream data chunk as parameter and returns a boolean value
 * @param options - Transform stream options
 */
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

/**
 * Create a map stream that transform chunks using the given predicate
 *
 * @param predicate - A map predicate, takes a stream data chunk as parameter and returns a mapped value
 * @param options - Transform stream options
 */
export const map = <T, U = T>(
  predicate: (value: T) => U | Promise<U>,
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
 * Collect every chunks from a Readable stream.
 *
 * @param stream - The redable stream to collect data from
 * @param options.destroy - If set to true, it automatically calls `destroy()` on the given stream upon receiving the 'end' event
 */
export const collect = <T = unknown>(
  stream: Readable,
  options: { destroy: boolean } = { destroy: true }
): Promise<T[]> => {
  const chunks: T[] = [];

  return new Promise((resolve, reject) => {
    stream
      .on('close', () => resolve(chunks))
      .on('error', reject)
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        if (options.destroy) {
          stream.destroy();
        }

        resolve(chunks);
      });
  });
};
