import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import type { Writable } from 'stream';

/**
 * Async helper for application code that `await`s sequential writes to a `Writable`.
 *
 * 1. Waits until `writable.write` invokes its callback (chunk accepted / `_write` finished).
 * 2. If `write()` returned `false` **and** `writable.writableNeedDrain` is still true after the
 *    callback, waits for `'drain'`.
 *
 * We check both: the return value tells us backpressure was signaled; `writableNeedDrain` avoids
 * awaiting `'drain'` when it already fired before we subscribed (would otherwise hang forever).
 *
 * While waiting for `'drain'`, we also race {@link finished} so destroying the writable (e.g. abort)
 * cannot leave this promise pending forever.
 */
export async function write(writable: Writable, chunk: unknown): Promise<void> {
  let flushed = true;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      writable.off('error', onError);
      fn();
    };
    const onError = (err: Error) => {
      finish(() => reject(err));
    };
    writable.once('error', onError);
    flushed = writable.write(chunk, (err) => {
      if (err) {
        // Do not reject or remove `error` here: Node may emit `error` after this callback, and
        // clearing the listener first would leave that emission unhandled.
        setImmediate(() => {
          if (!settled) {
            finish(() => reject(err));
          }
        });
        return;
      }
      finish(() => resolve());
    });
  });

  if (!flushed && writable.writableNeedDrain) {
    // Without `finished`, awaiting only `drain` can hang forever if the writable is destroyed first.
    await Promise.race([
      once(writable, 'drain'),
      finished(writable, { readable: false, writable: true }),
    ]);
  }
}
