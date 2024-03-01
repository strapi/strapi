import { join } from 'path';
import { Duplex, PassThrough, Readable } from 'stream';
import * as webStream from 'stream/web';
import { stat, createReadStream, ReadStream } from 'fs-extra';
import type { Core } from '@strapi/types';

import type { IAsset } from '../../../../types';

function getFileStream(
  filepath: string,
  strapi: Core.LoadedStrapi,
  isLocal = false
): PassThrough | ReadStream {
  if (isLocal) {
    return createReadStream(filepath);
  }

  const readableStream = new PassThrough();

  // fetch the image from remote url and stream it
  strapi
    .fetch(filepath)
    .then((res: Response) => {
      if (res.status !== 200) {
        readableStream.emit('error', new Error(`Request failed with status code ${res.status}`));
        return;
      }

      if (res.body) {
        // pipe the image data
        Readable.fromWeb(new webStream.ReadableStream(res.body)).pipe(readableStream);
      } else {
        readableStream.emit('error', new Error('Empty data found for file'));
      }
    })
    .catch((error: unknown) => {
      readableStream.emit('error', error);
    });

  return readableStream;
}

function getFileStats(
  filepath: string,
  strapi: Core.LoadedStrapi,
  isLocal = false
): Promise<{ size: number }> {
  if (isLocal) {
    return stat(filepath);
  }
  return new Promise((resolve, reject) => {
    strapi
      .fetch(filepath)
      .then((res: Response) => {
        if (res.status !== 200) {
          reject(new Error(`Request failed with status code ${res.status}`));
          return;
        }

        const contentLength = res.headers.get('content-length');
        const stats = {
          size: contentLength ? parseInt(contentLength, 10) : 0,
        };

        resolve(stats);
      })
      .catch((error: unknown) => {
        reject(error);
      });
  });
}
/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (strapi: Core.LoadedStrapi): Duplex => {
  const generator: () => AsyncGenerator<IAsset, void> = async function* () {
    const stream: Readable = strapi.db
      .queryBuilder('plugin::upload.file')
      // Create a query builder instance (default type is 'select')
      // Fetch all columns
      .select('*')
      // Get a readable stream
      .stream();

    for await (const file of stream) {
      const isLocalProvider = file.provider === 'local';
      const filepath = isLocalProvider ? join(strapi.dirs.static.public, file.url) : file.url;
      const stats = await getFileStats(filepath, strapi, isLocalProvider);
      const stream = getFileStream(filepath, strapi, isLocalProvider);

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

          const fileFormatStats = await getFileStats(fileFormatFilepath, strapi, isLocalProvider);
          const fileFormatStream = getFileStream(fileFormatFilepath, strapi, isLocalProvider);
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
