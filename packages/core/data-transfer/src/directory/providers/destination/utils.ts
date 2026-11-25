import { promises as fsp } from 'fs';
import path from 'path';

import { createBufferedEntryWriter } from '../../../utils/buffered-entry-writer';
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

  const resolvePath = (posixName: string) => path.join(rootDir, ...posixName.split('/'));

  const writeEntry = async (content: string) => {
    fileIndex += 1;
    const name = pathFactory(fileIndex);
    const targetPath = resolvePath(name);
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.writeFile(targetPath, content, 'utf8');
  };

  return createBufferedEntryWriter({ maxSize, writeEntry, flushOnFinal: true });
};
