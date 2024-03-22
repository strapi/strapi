import { join } from 'path';
import https from 'https';
import http from 'http';
import { Duplex, PassThrough, Readable } from 'stream';
import { stat, createReadStream, ReadStream } from 'fs-extra';
import type { LoadedStrapi } from '@strapi/types';

import type { IAsset, IFile } from '../../../../types';

const protocolForPath = (filepath: string) => {
  return filepath?.startsWith('https') ? https : http;
};

function getFileStream(filepath: string, isLocal = false): PassThrough | ReadStream {
  if (isLocal) {
    // Todo: handle errors
    return createReadStream(filepath);
  }

  const readableStream = new PassThrough();
  protocolForPath(filepath)
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
    protocolForPath(filepath)
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

async function signFile(file: IFile) {
  const { provider } = strapi.plugins.upload;
  const { provider: providerName } = strapi.config.get('plugin.upload') as { provider: string };
  const isPrivate = await provider.isPrivate();
  if (file?.provider === providerName && isPrivate) {
    const signUrl = async (file: IFile) => {
      const signedUrl = await provider.getSignedUrl(file);
      file.url = signedUrl.url;
    };

    // Sign the original file
    await signUrl(file);
    // Sign each file format
    if (file.formats) {
      for (const format of Object.keys(file.formats)) {
        await signUrl(file.formats[format]);
      }
    }
  }
}

/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (strapi: LoadedStrapi): Duplex => {
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
      if (!isLocalProvider) {
        await signFile(file);
      }
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
          const metadata = { ...fileFormat, type: format, id: file.id, mainHash: file.hash };
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
