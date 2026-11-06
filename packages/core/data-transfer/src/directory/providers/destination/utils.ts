import { promises as fsp } from 'fs';
import path from 'path';
import { Writable } from 'stream';

import { createFilePathFactory } from '../../../file/providers/destination/utils';

export { createFilePathFactory };

/**
 * JSONL writer that mirrors {@link createTarEntryStream} but writes files under a root directory.
 */
export const createDirectoryJsonlWriter = (
  rootDir: string,
  pathFactory: (index?: number) => string,
  maxSize = 2.56e8
) => {
  let fileIndex = 0;
  let buffer = '';
  let finalFailed = false;

  const resolvePath = (posixName: string) => path.join(rootDir, ...posixName.split('/'));

  const flush = async () => {
    if (!buffer) {
      return;
    }

    fileIndex += 1;
    const name = pathFactory(fileIndex);
    const targetPath = resolvePath(name);
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.writeFile(targetPath, buffer, 'utf8');
    buffer = '';
  };

  const push = (chunk: string | Buffer) => {
    buffer += chunk;
  };

  return new Writable({
    async final(callback) {
      try {
        await flush();
        callback();
      } catch (err: unknown) {
        finalFailed = true;
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },

    async destroy(err, callback) {
      // Always call back, or the stream never closes. After a failed `final` the data is lost
      // already: flushing it again would only fail again.
      if (finalFailed) {
        callback(err);
        return;
      }
      try {
        await flush();
        callback(err);
      } catch (flushError: unknown) {
        callback(err ?? (flushError instanceof Error ? flushError : new Error(String(flushError))));
      }
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
