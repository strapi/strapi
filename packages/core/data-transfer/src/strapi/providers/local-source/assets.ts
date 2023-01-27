import { join } from 'path';
import { readdir, stat, createReadStream } from 'fs-extra';
import { Duplex } from 'stream';

import type { IAsset } from '../../../../types';

const IGNORED_FILES = ['.gitkeep'];

/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (strapi: Strapi.Strapi): Duplex => {
  const assetsDirectory = join(strapi.dirs.static.public, 'uploads');

  const generator: () => AsyncGenerator<IAsset, void> = async function* () {
    const files = await readdir(assetsDirectory);
    const validFiles = files.filter((file) => !IGNORED_FILES.includes(file));

    for (const filename of validFiles) {
      const filepath = join(assetsDirectory, filename);
      const stats = await stat(filepath);
      const stream = createReadStream(filepath);

      yield {
        filename,
        filepath,
        stream,
        stats: { size: stats.size },
      };
    }
  };

  return Duplex.from(generator());
};
