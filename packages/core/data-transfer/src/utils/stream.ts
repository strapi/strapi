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
    let settled = false;

    const cleanup = () => {
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      stream.removeListener('close', onClose);
      stream.removeListener('error', onError);
    };

    const finishResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(chunks);
    };

    const finishReject = (err: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(err);
    };

    const onData = (chunk: T) => {
      chunks.push(chunk);
    };

    const onEnd = () => {
      if (options.destroy) {
        stream.destroy();
      }
      finishResolve();
    };

    const onClose = () => {
      // Handles streams that emit `close` without `end` (e.g. `destroy()` in `_read`).
      finishResolve();
    };

    const onError = (err: Error) => {
      finishReject(err);
    };

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('close', onClose);
    stream.on('error', onError);
  });
};
