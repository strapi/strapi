import { join } from 'path';
import https from 'https';
import { stat, createReadStream, ReadStream } from 'fs-extra';
import { Duplex, PassThrough } from 'stream';

import type { IAsset, IFile } from '../../../../types';

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
    const files: IFile[] = await strapi.query('plugin::upload.file').findMany();
    console.log('files', JSON.stringify(files, null, 2));
    for (const file of files) {
      const isLocalProvider = file.provider === 'local';
      const filepath = isLocalProvider ? join(strapi.dirs.static.public, file.url) : file.url;
      const stats = await getFileStats(filepath, isLocalProvider);
      const stream = getFileStream(filepath, isLocalProvider);

      yield {
        metadata: file, // TODO: filter it down to just this file
        filepath,
        filename: file.hash + file.ext,
        stream,
        stats: { size: stats.size },
      };

      if (file.formats) {
        for (const format of Object.values(file.formats)) {
          const fileFormat = format;
          const fileFormatFilepath = isLocalProvider
            ? join(strapi.dirs.static.public, fileFormat.url)
            : fileFormat.url;

          const thumbStats = await getFileStats(fileFormatFilepath, isLocalProvider);
          const thumbStream = getFileStream(fileFormatFilepath, isLocalProvider);

          yield {
            metadata: file, // TODO: filter it down to just this file
            filepath: fileFormatFilepath,
            filename: fileFormat.hash + fileFormat.ext,
            stream: thumbStream,
            stats: { size: thumbStats.size },
          };
        }
      }
    }
  };

  return Duplex.from(generator());
};
