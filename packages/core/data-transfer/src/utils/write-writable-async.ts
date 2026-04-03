import type { Writable } from 'stream';

/**
 * Write a chunk to a Node.js {@link Writable} and resolve when it is safe to call
 * {@link Writable.write} again for the next chunk.
 *
 * - If {@link Writable.write} returns `true`, the internal buffer had room; we resolve after the
 *   write callback succeeds (no error).
 * - If it returns `false`, the buffer was full; per Node’s contract you must not write again
 *   until `'drain'` fires. We resolve only after **both** a successful write callback **and**
 *   `'drain'` (order may vary).
 */
export function writeWritableAsync(stream: Writable, chunk: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!stream.writable || stream.writableEnded) {
      reject(new Error('Stream is not writable'));
      return;
    }

    let settled = false;
    let callbackDone = false;
    let drainDone = false;

    const cleanup = () => {
      stream.removeListener('error', onStreamError);
      stream.removeListener('drain', onDrain);
    };

    const tryResolve = () => {
      if (settled) {
        return;
      }
      if (writeReturnedOk) {
        if (callbackDone) {
          settled = true;
          cleanup();
          resolve();
        }
      } else if (callbackDone && drainDone) {
        settled = true;
        cleanup();
        resolve();
      }
    };

    const finishWithError = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      // Writable may also emit 'error' after _write invokes callback(err); consume once.
      stream.once('error', () => {});
      reject(err);
    };

    const onStreamError = (err: Error) => finishWithError(err);
    const onDrain = () => {
      drainDone = true;
      tryResolve();
    };

    stream.once('error', onStreamError);

    let writeReturnedOk: boolean;
    try {
      writeReturnedOk = stream.write(chunk, (err) => {
        callbackDone = true;
        if (err) {
          finishWithError(err);
        } else {
          tryResolve();
        }
      });
    } catch (e) {
      finishWithError(e instanceof Error ? e : new Error(String(e)));
      return;
    }

    if (!writeReturnedOk) {
      stream.once('drain', onDrain);
    }
  });
}
