import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { deferWritable } from './defer-writable';
import { loadStreamDeps } from './esm-deps';

/**
 * Object-mode Writable that serializes each chunk as one JSONL line into `entryStream`.
 *
 * It finishes only once `entryStream` has finished and closed. Entry writers flush their last
 * file when destroyed without an error. When destroyed with an error they discard the buffer that
 * has not started flushing. This stream waits for a flush that is already running to finish
 * before it closes, so a rollback that waits for this stream does not race that write.
 * Any `entryStream` error, including one raised after the input ended, fails this stream.
 */
const createJsonlWriteStream = (entryStream: Writable): Writable => {
  return deferWritable(async () => {
    const { stringer } = await loadStreamDeps();
    const jsonl = stringer();

    // Registered before pipeline() so the cause is known before pipeline destroys `jsonl`;
    // otherwise the next write fails with ERR_STREAM_DESTROYED instead of the real error.
    let entryError: Error | undefined;
    entryStream.once('error', (error: Error) => {
      entryError = error;
    });

    const written = pipeline(jsonl, entryStream);

    const writer = new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        if (entryError) {
          callback(entryError);
          return;
        }

        jsonl.write(chunk, encoding, (error) => {
          callback(error ? (entryError ?? error) : null);
        });
      },
      final(callback) {
        jsonl.end();
        written.then(() => callback(), callback);
      },
      destroy(error, callback) {
        // Pass the error through. An error-free destroy flushes the entry buffer and would write
        // a partial file while rollback deletes the export. Wait for the entry stream to close so
        // a flush that is already running finishes before that rollback.
        let finished = false;
        const finish = () => {
          if (finished) {
            return;
          }

          finished = true;
          callback(error);
        };

        if (!jsonl.destroyed) {
          jsonl.destroy(error ?? undefined);
        }

        if (entryStream.closed) {
          finish();
          return;
        }

        entryStream.once('close', finish);
        if (!entryStream.destroyed) {
          entryStream.destroy(error ?? undefined);
        }
      },
    });

    written.catch((error: Error) => {
      writer.destroy(error);
    });

    return writer;
  });
};

export { createJsonlWriteStream };
