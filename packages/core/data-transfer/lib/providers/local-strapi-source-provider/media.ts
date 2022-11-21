import * as path from 'path';
import * as fs from 'fs';
import { Duplex } from 'stream';

const IGNORED_FILES = ['.gitkeep'];

/**
 * Generate and consume media streams in order to stream each file individually
 */
export const createMediaStream = (strapi: Strapi.Strapi): Duplex => {
  const mediaDirectory = path.join(strapi.dirs.static.public, 'uploads');

  return Duplex.from(function* () {
    const files = fs.readdirSync(mediaDirectory).filter((file) => !IGNORED_FILES.includes(file));

    for (const file of files) {
      const filePath = path.join(mediaDirectory, file);
      const stats = fs.statSync(filePath);
      const stream = fs.createReadStream(filePath);

      yield { file, path: filePath, stats, stream };
    }
  });
};
