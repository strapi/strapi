import { Writable } from 'stream';

type WriteCallback = (error?: Error | null) => void;

interface PendingWrite {
  chunk: unknown;
  encoding: BufferEncoding;
  callback: WriteCallback;
}

/**
 * A Writable that can be handed back before its real destination exists.
 * Writes wait until `open` resolves, and ending the stream waits until that destination ends.
 * A failure in `open` destroys this stream with that error.
 */
const deferWritable = (open: () => Promise<Writable>): Writable => {
  let target: Writable | undefined;
  const queue: PendingWrite[] = [];
  let failed = false;

  const fail = (error: Error) => {
    if (failed || proxy.destroyed) {
      return;
    }

    failed = true;
    const pending = queue.splice(0);
    pending.forEach((item) => item.callback(error));
    proxy.destroy(error);
  };

  const pump = () => {
    if (!target || failed) {
      return;
    }

    while (queue.length > 0) {
      const next = queue[0];
      const accepted = target.write(next.chunk, next.encoding, next.callback);
      queue.shift();

      if (!accepted) {
        target.once('drain', pump);
        return;
      }
    }
  };

  const opening = Promise.resolve()
    .then(open)
    .then((destination) => {
      if (failed || proxy.destroyed) {
        destination.destroy();
        return;
      }

      target = destination;
      destination.on('error', (error: Error) => {
        fail(error);
      });
      pump();
    })
    .catch((error: unknown) => {
      fail(error instanceof Error ? error : new Error(String(error)));
    });

  const proxy = new Writable({
    objectMode: true,

    write(chunk, encoding, callback) {
      if (failed) {
        callback(new Error('Write stream failed before it was ready'));
        return;
      }

      if (target) {
        target.write(chunk, encoding, callback);
        return;
      }

      queue.push({ chunk, encoding, callback });
    },

    final(callback) {
      const endTarget = () => {
        if (!target) {
          callback(new Error('Write stream ended before it was ready'));
          return;
        }

        target.end(callback);
      };

      if (target) {
        endTarget();
        return;
      }

      opening.then(endTarget).catch((error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)));
      });
    },

    destroy(error, callback) {
      failed = true;
      const pending = queue.splice(0);
      const destroyError = error ?? new Error('Stream destroyed');
      pending.forEach((item) => item.callback(destroyError));

      if (target && !target.destroyed) {
        target.destroy(error ?? undefined);
      }

      callback(error);
    },
  });

  return proxy;
};

export { deferWritable };
