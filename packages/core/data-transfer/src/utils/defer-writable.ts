import { Writable } from 'stream';

import { errorFromUnknown } from './unknown-error';

type WriteCallback = (error?: Error | null) => void;

interface PendingWrite {
  chunk: unknown;
  encoding: BufferEncoding;
  callback: WriteCallback;
}

/**
 * A Writable that can be handed back before its real destination exists.
 * Writes wait until `open` resolves, and ending the stream waits until that destination ends.
 * A failure in `open`, or an error from the destination, destroys this stream with that error.
 */
const deferWritable = (open: () => Promise<Writable>): Writable => {
  let target: Writable | undefined;
  // Writable does not call write() again until the previous callback runs, so at most one
  // write can be waiting for the destination.
  let pending: PendingWrite | undefined;

  const opening = Promise.resolve()
    .then(open)
    .then(
      (destination) => {
        if (proxy.destroyed) {
          destination.destroy();
          return;
        }

        target = destination;
        destination.on('error', (error: Error) => {
          proxy.destroy(error);
        });

        if (pending) {
          const { chunk, encoding, callback } = pending;
          pending = undefined;
          destination.write(chunk, encoding, callback);
        }
      },
      (error: unknown) => {
        proxy.destroy(errorFromUnknown(error));
      }
    );

  const proxy = new Writable({
    objectMode: true,

    write(chunk, encoding, callback) {
      if (target) {
        target.write(chunk, encoding, callback);
        return;
      }

      pending = { chunk, encoding, callback };
    },

    final(callback) {
      opening.then(() => {
        if (!target) {
          callback(new Error('Write stream ended before it was ready'));
          return;
        }

        target.end(callback);
      });
    },

    destroy(error, callback) {
      if (pending) {
        const { callback: pendingCallback } = pending;
        pending = undefined;
        pendingCallback(error ?? new Error('Stream destroyed'));
      }

      if (target && !target.destroyed) {
        target.destroy(error ?? undefined);
      }

      callback(error);
    },
  });

  return proxy;
};

export { deferWritable };
