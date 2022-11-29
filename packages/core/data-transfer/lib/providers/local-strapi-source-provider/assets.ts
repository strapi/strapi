import * as path from 'path';
import * as fse from 'fs-extra';
import { Duplex } from 'stream';

const IGNORED_FILES = ['.gitkeep'];

/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (strapi: Strapi.Strapi): Duplex => {
  const assetsDirectory = path.join(strapi.dirs.static.public, 'uploads');

  return Duplex.from(
    (async function* () {
      const files = await fse.readdir(assetsDirectory);
      const validFiles = files.filter((file) => !IGNORED_FILES.includes(file));

      for (const file of validFiles) {
        const filePath = path.join(assetsDirectory, file);
        const stats = await fse.stat(filePath);
        const stream = fse.createReadStream(filePath);

        yield { file, path: filePath, stats, stream };
      }
    })()
  );
};
