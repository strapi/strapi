import { Writable } from 'stream';
import { pipeline } from 'stream/promises';

import { deferWritable } from './defer-writable';
import { loadStreamDeps } from './esm-deps';

/**
 * Object-mode Writable that serializes each chunk as one JSONL line into `entryStream`.
 *
 * It finishes only once `entryStream` has finished and closed, because entry writers may flush
 * their last file on destroy. Any `entryStream` error, including one raised after the input
 * ended, fails this stream.
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
        jsonl.destroy();
        entryStream.destroy();
        callback(error);
      },
    });

    written.catch((error: Error) => {
      writer.destroy(error);
    });

    return writer;
  });
};

export { createJsonlWriteStream };
