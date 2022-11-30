import * as path from 'path';
import * as fse from 'fs-extra';
import { Duplex } from 'stream';
import { IAsset } from '../../../types';

const IGNORED_FILES = ['.gitkeep'];

/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (strapi: Strapi.Strapi): Duplex => {
  const assetsDirectory = path.join(strapi.dirs.static.public, 'uploads');

  const generator: () => AsyncGenerator<IAsset, void> = async function* () {
    const files = await fse.readdir(assetsDirectory);
    const validFiles = files.filter((file) => !IGNORED_FILES.includes(file));

    for (const file of validFiles) {
      const filepath = path.join(assetsDirectory, file);
      const stats = await fse.stat(filepath);
      const stream = fse.createReadStream(filepath);

      yield {
        filename: file,
        filepath,
        stream,
        stats: { size: stats.size },
      };
    }
  };

  return Duplex.from(generator());
};
