import { join } from 'path';
import { Duplex, PassThrough, Readable } from 'stream';
import { stat, createReadStream, ReadStream } from 'fs-extra';
import * as webStream from 'stream/web';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../types';

interface ErrorWithFilepath extends Error {
  filepath?: string;
}

function createErrorWithFilepath(message: string, filepath: string): ErrorWithFilepath {
  const error: ErrorWithFilepath = new Error(message);
  error.filepath = filepath;
  return error;
}

function getFileStream(
  filepath: string,
  strapi: Core.Strapi,
  isLocal = false
): PassThrough | ReadStream {
  if (isLocal) {
    const stream = createReadStream(filepath);
    stream.on('error', (err: ErrorWithFilepath) => {
      err.filepath = filepath;
    });
    return stream;
  }

  const readableStream = new PassThrough();

  // fetch the image from remote url and stream it
  strapi
    .fetch(filepath)
    .then((res: Response) => {
      if (res.status !== 200) {
        readableStream.emit(
          'error',
          createErrorWithFilepath(`Request failed with status code ${res.status}`, filepath)
        );
        return;
      }

      if (res.body) {
        // pipe the image data
        Readable.fromWeb(res.body as webStream.ReadableStream<Uint8Array>).pipe(readableStream);
      } else {
        readableStream.emit(
          'error',
          createErrorWithFilepath('Empty data found for file', filepath)
        );
      }
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        (error as ErrorWithFilepath).filepath = filepath;
      }
      readableStream.emit('error', error);
    });

  return readableStream;
}

export function getFileStatsForTransfer(
  filepath: string,
  strapi: Core.Strapi,
  isLocal = false
): Promise<{ size: number }> {
  if (isLocal) {
    return stat(filepath).catch((err: ErrorWithFilepath) => {
      err.filepath = filepath;
      throw err;
    });
  }
  return new Promise((resolve, reject) => {
    strapi
      .fetch(filepath)
      .then((res: Response) => {
        if (res.status !== 200) {
          reject(
            createErrorWithFilepath(`Request failed with status code ${res.status}`, filepath)
          );
          return;
        }

        const contentLength = res.headers.get('content-length');
        const stats = {
          size: contentLength ? parseInt(contentLength, 10) : 0,
        };

        resolve(stats);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          (error as ErrorWithFilepath).filepath = filepath;
        }
        reject(error);
      });
  });
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
