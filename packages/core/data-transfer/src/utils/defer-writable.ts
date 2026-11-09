import { Writable } from 'node:stream';

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
 * Destroy waits until that destination closes, so a flush it is already running finishes
 * before a caller that waits for this stream, including rollback, continues.
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
        target = destination;
        // Swallow a destroy error when this proxy is already destroyed. Otherwise an
        // in-flight flush that fails while we are waiting for close becomes unhandled.
        destination.on('error', (error: Error) => {
          if (!proxy.destroyed) {
            proxy.destroy(error);
          }
        });

        if (proxy.destroyed) {
          return;
        }

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
      opening
        .then(() => {
          if (!target) {
            callback(new Error('Write stream ended before it was ready'));
            return;
          }

          target.end(callback);
        })
        .catch((error: unknown) => {
          callback(errorFromUnknown(error));
        });
    },

    destroy(error, callback) {
      if (pending) {
        const { callback: pendingCallback } = pending;
        pending = undefined;
        pendingCallback(error ?? new Error('Stream destroyed'));
      }

      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;
        callback(error);
      };

      // Rollback starts only after pipeline() rejects, and pipeline() waits for this close.
      // Waiting here keeps a destination flush that is already running ahead of that rollback.
      const waitForClose = (stream: Writable) => {
        if (stream.closed) {
          finish();
          return;
        }

        stream.once('close', finish);
        if (!stream.destroyed) {
          stream.destroy(error ?? undefined);
        }
      };

      if (target) {
        waitForClose(target);
        return;
      }

      opening.then(
        () => {
          if (target) {
            waitForClose(target);
            return;
          }

          finish();
        },
        () => {
          finish();
        }
      );
    },
  });

  return proxy;
};

export { deferWritable };
