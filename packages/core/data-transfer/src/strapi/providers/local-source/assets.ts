import { join } from 'path';
import https from 'https';
import { Duplex, PassThrough, Readable } from 'stream';
import { stat, createReadStream, ReadStream } from 'fs-extra';

import type { IAsset } from '../../../../types';

function getFileStream(filepath: string, isLocal = false): PassThrough | ReadStream {
  if (isLocal) {
    return createReadStream(filepath);
  }

  const readableStream = new PassThrough();

  https
    .get(filepath, (res) => {
      if (res.statusCode !== 200) {
        readableStream.emit(
          'error',
          new Error(`Request failed with status code ${res.statusCode}`)
        );
        return;
      }

      res.pipe(readableStream);
    })
    .on('error', (error) => {
      readableStream.emit('error', error);
    });

  return readableStream;
}

function getFileStats(filepath: string, isLocal = false): Promise<{ size: number }> {
  if (isLocal) {
    return stat(filepath);
  }
  return new Promise((resolve, reject) => {
    https
      .get(filepath, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
          return;
        }

        const contentLength = res.headers['content-length'];
        const stats = {
          size: contentLength ? parseInt(contentLength, 10) : 0,
        };

        resolve(stats);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}
/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (strapi: Strapi.Strapi): Duplex => {
  const generator: () => AsyncGenerator<IAsset, void> = async function* () {
    const stream: Readable = strapi.db
      // Create a query builder instance (default type is 'select')
      .queryBuilder('plugin::upload.file')
      // Fetch all columns
      .select('*')
      // Get a readable stream
      .stream();

    for await (const file of stream) {
      const isLocalProvider = file.provider === 'local';
      const filepath = isLocalProvider ? join(strapi.dirs.static.public, file.url) : file.url;
      const stats = await getFileStats(filepath, isLocalProvider);
      const stream = getFileStream(filepath, isLocalProvider);

      yield {
        metadata: file,
        filepath,
        filename: file.hash + file.ext,
        stream,
        stats: { size: stats.size },
      };

      if (file.formats) {
        for (const format of Object.keys(file.formats)) {
          const fileFormat = file.formats[format];
          const fileFormatFilepath = isLocalProvider
            ? join(strapi.dirs.static.public, fileFormat.url)
            : fileFormat.url;

          const fileFormatStats = await getFileStats(fileFormatFilepath, isLocalProvider);
          const fileFormatStream = getFileStream(fileFormatFilepath, isLocalProvider);
          const metadata = { ...fileFormat, type: format, mainHash: file.hash };
          yield {
            metadata,
            filepath: fileFormatFilepath,
            filename: fileFormat.hash + fileFormat.ext,
            stream: fileFormatStream,
            stats: { size: fileFormatStats.size },
          };
        }
      }
    }
  };

  return Duplex.from(generator());
};
