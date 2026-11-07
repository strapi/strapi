import { Writable } from 'node:stream';

const toError = (err: unknown): Error => (err instanceof Error ? err : new Error(String(err)));

interface BufferedEntryWriterOptions {
  maxSize: number;
  /** Writes one full buffer as a new entry (file). Called one at a time, in order. */
  writeEntry: (content: string) => Promise<void>;
  /** Also flush the remaining buffer when the writable side ends. */
  flushOnFinal?: boolean;
}

/**
 * Writable that buffers chunks and writes them as entries once `maxSize` would be exceeded.
 *
 * - Flush failures reach the stream callbacks instead of becoming unhandled rejections.
 * - Write, final and destroy share one flush chain, so flushes never overlap.
 * - Destroyed without an error: flush what is left and report a failure to the destroy callback.
 * - Destroyed with an error: discard the buffer that has not started flushing, but wait for a flush
 *   that is already running so a rollback does not race it. The original error is kept.
 */
export const createBufferedEntryWriter = ({
  maxSize,
  writeEntry,
  flushOnFinal = false,
}: BufferedEntryWriterOptions) => {
  let buffer = '';
  let inFlight: Promise<void> | undefined;

  const flush = (): Promise<void> => {
    const run = async () => {
      if (!buffer) {
        return;
      }

      // Take the buffer first, a flush already running owns what it took
      const content = buffer;
      buffer = '';
      await writeEntry(content);
    };

    const next = (inFlight ?? Promise.resolve()).catch(() => undefined).then(run);
    inFlight = next;

    const clear = () => {
      if (inFlight === next) {
        inFlight = undefined;
      }
    };
    next.then(clear, clear);

    return next;
  };

  return new Writable({
    async final(callback) {
      if (!flushOnFinal) {
        callback();
        return;
      }

      try {
        await flush();
      } catch (err) {
        callback(toError(err));
        return;
      }

      callback();
    },

    async destroy(err, callback) {
      if (err) {
        // Discard the buffer that has not started flushing. A flush that is already running
        // finishes first, and its own failure must not replace the destroy error.
        buffer = '';
        await inFlight?.catch(() => undefined);
        callback(err);
        return;
      }

      try {
        await flush();
      } catch (flushError) {
        callback(toError(flushError));
        return;
      }

      callback(null);
    },

    async write(chunk, _encoding, callback) {
      const size = chunk.length;

      if (size > maxSize) {
        callback(new Error(`payload too large: ${size}>${maxSize}`));
        return;
      }

      try {
        if (buffer.length + size > maxSize) {
          await flush();
        }
      } catch (err) {
        callback(toError(err));
        return;
      }

      // Destroyed while flushing: the error path discards data, so do not buffer this chunk
      if (this.destroyed) {
        callback();
        return;
      }

      buffer += chunk;

      callback(null);
    },
  });
};
