import { join } from 'path';
import { Duplex, PassThrough, Readable } from 'stream';
import { stat, createReadStream, ReadStream } from 'fs-extra';
import * as webStream from 'stream/web';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../types';

const HTTP_OK_STATUS = 200;
const DECIMAL_RADIX = 10;
const CONTENT_LENGTH_HEADER = 'content-length';
const CONTENT_ENCODING_HEADER = 'content-encoding';

function getFileStream(
  filepath: string,
  strapi: Core.Strapi,
  isLocal = false
): PassThrough | ReadStream {
  if (isLocal) {
    // Todo: handle errors
    return createReadStream(filepath);
  }

  const readableStream = new PassThrough();

  // fetch the image from remote url and stream it
  strapi
    .fetch(filepath)
    .then((res: Response) => {
      if (res.status !== HTTP_OK_STATUS) {
        readableStream.emit('error', new Error(`Request failed with status code ${res.status}`));
        return;
      }

      if (res.body) {
        // pipe the image data
        Readable.fromWeb(res.body as webStream.ReadableStream<Uint8Array>).pipe(readableStream);
      } else {
        readableStream.emit('error', new Error('Empty data found for file'));
      }
    })
    .catch((error: unknown) => {
      readableStream.emit('error', error);
    });

  return readableStream;
}

export async function getFileStatsForTransfer(
  filepath: string,
  strapi: Core.Strapi,
  isLocal = false
): Promise<{ size: number }> {
  if (isLocal) {
    return stat(filepath);
  }

  const response = await strapi.fetch(filepath);
  if (response.status !== HTTP_OK_STATUS) {
    throw new Error(`Request failed with status code ${response.status}`);
  }

  const contentLength = response.headers.get(CONTENT_LENGTH_HEADER);
  const contentEncoding = response.headers.get(CONTENT_ENCODING_HEADER);
  if (contentLength && !contentEncoding) {
    return { size: parseInt(contentLength, DECIMAL_RADIX) };
  }

  if (!response.body) {
    return { size: 0 };
  }

  const reader = response.body.getReader();
  let size = 0;

  try {
    let result = await reader.read();
    while (!result.done) {
      size += result.value.byteLength;
      result = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }

  return { size };
}

export async function signUploadFileForTransfer(strapi: Core.Strapi, file: IFile) {
  const { provider } = strapi.plugins.upload;
  const { provider: providerName } = strapi.config.get('plugin.upload') as { provider: string };
  const isPrivate = await provider.isPrivate();
  if (file?.provider === providerName && isPrivate) {
    const signUrl = async (f: IFile) => {
      const signedUrl = await provider.getSignedUrl(f);
      f.url = signedUrl.url;
    };

    await signUrl(file);
    if (file.formats) {
      for (const format of Object.keys(file.formats)) {
        await signUrl(file.formats[format]);
      }
    }
  }
}

const missingAssetWarningMessage = (file: IFile, filepath: string, format?: string): string => {
  const formatPart = format ? ` (format: ${format})` : '';
  return `[Data transfer] Media item ${file.id} (hash: ${file.hash}) exists in database but no corresponding file was found to transfer${formatPart}. Path: ${filepath}`;
};

/**
 * Generate and consume assets streams in order to stream each file individually
 */
export const createAssetsStream = (
  strapi: Core.Strapi,
  options: { onWarning?: (message: string) => void } = {}
): Duplex => {
  const warnMissingAsset = (message: string) => {
    strapi.log.warn(message);
    options.onWarning?.(message);
  };

  const generator: () => AsyncGenerator<IAsset, void> = async function* generateAssets() {
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
        await signUploadFileForTransfer(strapi, file);
      }
      const filepath = isLocalProvider ? join(strapi.dirs.static.public, file.url) : file.url;
      let stats: { size: number };
      try {
        stats = await getFileStatsForTransfer(filepath, strapi, isLocalProvider);
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? (err as NodeJS.ErrnoException).code
            : undefined;
        if (code === 'ENOENT') {
          warnMissingAsset(missingAssetWarningMessage(file, filepath));
          continue;
        }
        throw err;
      }
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
          let fileFormatStats: { size: number };
          try {
            fileFormatStats = await getFileStatsForTransfer(
              fileFormatFilepath,
              strapi,
              isLocalProvider
            );
          } catch (err: unknown) {
            const code =
              err && typeof err === 'object' && 'code' in err
                ? (err as NodeJS.ErrnoException).code
                : undefined;
            if (code === 'ENOENT') {
              warnMissingAsset(missingAssetWarningMessage(file, fileFormatFilepath, format));
              continue;
            }
            throw err;
          }
          const fileFormatStream = getFileStream(fileFormatFilepath, strapi, isLocalProvider);
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
