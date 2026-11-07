import { posix } from 'path';
import tar from 'tar-stream';

import { createBufferedEntryWriter } from '../../../utils/buffered-entry-writer';

/**
 * Create a file path factory for a given path & prefix.
 * Upon being called, the factory will return a file path for a given index
 */
export const createFilePathFactory =
  (type: string) =>
  (fileIndex = 0): string => {
    // always write tar files with posix paths so we have a standard format for paths regardless of system
    return posix.join(
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

  const writeEntry = (content: string) => {
    fileIndex += 1;
    const name = pathFactory(fileIndex);
    const size = content.length;

    return new Promise<void>((resolve, reject) => {
      archive.entry({ name, size }, content, (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  };

  return createBufferedEntryWriter({ maxSize, writeEntry });
};
