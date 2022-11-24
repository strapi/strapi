import * as path from 'path';
import * as fs from 'fs';
import { Duplex } from 'stream';

const IGNORED_FILES = ['.gitkeep'];

/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (strapi: Strapi.Strapi): Duplex => {
  const assetsDirectory = path.join(strapi.dirs.static.public, 'uploads');

  return Duplex.from(
    (function* () {
      const files = fs.readdirSync(assetsDirectory).filter((file) => !IGNORED_FILES.includes(file));

      for (const file of files) {
        const filePath = path.join(assetsDirectory, file);
        const stats = fs.statSync(filePath);
        const stream = fs.createReadStream(filePath);

        yield { file, path: filePath, stats, stream };
      }
    })()
  );
};
