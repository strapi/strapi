import { Writable } from 'stream';
import { join } from 'path';
import tar from 'tar-stream';

/**
 * Create a file path factory for a given path & prefix.
 * Upon being called, the factory will return a file path for a given index
 */
export const createFilePathFactory =
  (type: string) =>
  (fileIndex = 0): string => {
    return join(
      // "{type}" directory
      type,
      // "${type}_XXXXX.jsonl" file
      `${type}_${String(fileIndex).padStart(5, '0')}.jsonl`
    );
  };

export const createTarEntryStream = (
  archive: tar.Pack,
  pathFactory: (index?: number) => string,
  maxSize = 2.56e8
) => {
  let fileIndex = 0;
  let buffer = '';

  const flush = async () => {
    if (!buffer) {
      return;
    }

    fileIndex += 1;
    const name = pathFactory(fileIndex);
    const size = buffer.length;

    await new Promise<void>((resolve, reject) => {
      archive.entry({ name, size }, buffer, (err) => {
        if (err) {
          reject(err);
        }

        resolve();
      });
    });

    buffer = '';
  };

  const push = (chunk: string | Buffer) => {
    buffer += chunk;
  };

  return new Writable({
    async destroy(err, callback) {
      await flush();
      callback(err);
    },

    async write(chunk, _encoding, callback) {
      const size = chunk.length;

      if (chunk.length > maxSize) {
        callback(new Error(`payload too large: ${chunk.length}>${maxSize}`));
        return;
      }

      if (buffer.length + size > maxSize) {
        await flush();
      }

      push(chunk);

      callback(null);
    },
  });
};
