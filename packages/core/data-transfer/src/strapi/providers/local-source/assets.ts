import { tmpdir } from 'os';
import { join } from 'path';
import { Duplex, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { stat, createReadStream, createWriteStream, mkdtemp, remove } from 'fs-extra';
import * as webStream from 'stream/web';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../types';

/**
 * Number of times a remote asset download is attempted before the transfer fails.
 */
const REMOTE_ASSET_DOWNLOAD_ATTEMPTS = 3;

/**
 * A response that will not change on retry (e.g. a non-200 status).
 */
class RemoteAssetResponseError extends Error {}

interface AssetForTransfer {
  stats: { size: number };
  stream: Readable;
}

async function downloadRemoteAsset(filepath: string, strapi: Core.Strapi, destination: string) {
  const res: Response = await strapi.fetch(filepath);

  if (res.status !== 200) {
    res.body?.cancel().catch(() => {});
    throw new RemoteAssetResponseError(`Request failed with status code ${res.status}`);
  }

  if (!res.body) {
    throw new RemoteAssetResponseError('Empty data found for file');
  }

  await pipeline(
    Readable.fromWeb(res.body as webStream.ReadableStream<Uint8Array>),
    createWriteStream(destination)
  );
}

/**
 * Downloads a remote asset into a temporary file and streams it from there.
 *
 * The transfer engine buffers several assets ahead of the destination and pipes each asset's
 * stream as soon as it is read, so streaming straight from the HTTP response leaves many
 * downloads open and paused on backpressure. Storage providers close such idle connections
 * ("other side closed"), which aborts the whole transfer. Downloading each file completely,
 * one at a time as the generator advances, keeps no connection idle. The temporary file is
 * removed once its stream closes.
 */
async function getRemoteAssetForTransfer(
  filepath: string,
  strapi: Core.Strapi
): Promise<AssetForTransfer> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= REMOTE_ASSET_DOWNLOAD_ATTEMPTS; attempt += 1) {
    const dir = await mkdtemp(join(tmpdir(), 'strapi-transfer-asset-'));
    const file = join(dir, 'asset');
    const removeDir = () => remove(dir).catch(() => {});

    try {
      await downloadRemoteAsset(filepath, strapi, file);
      const { size } = await stat(file);
      const stream = createReadStream(file);
      stream.once('close', removeDir);

      return { stats: { size }, stream };
    } catch (error: unknown) {
      await removeDir();

      if (error instanceof RemoteAssetResponseError) {
        throw error;
      }

      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      strapi.log.warn(
        `[Data transfer] Downloading ${filepath} failed (attempt ${attempt}/${REMOTE_ASSET_DOWNLOAD_ATTEMPTS}): ${message}`
      );
    }
  }

  throw lastError;
}

async function getAssetForTransfer(
  filepath: string,
  strapi: Core.Strapi,
  isLocal: boolean
): Promise<AssetForTransfer> {
  if (!isLocal) {
    return getRemoteAssetForTransfer(filepath, strapi);
  }

  const stats = await stat(filepath);
  return { stats, stream: createReadStream(filepath) };
}

export function getFileStatsForTransfer(
  filepath: string,
  strapi: Core.Strapi,
  isLocal = false
): Promise<{ size: number }> {
  if (isLocal) {
    return stat(filepath);
  }
  return new Promise((resolve, reject) => {
    strapi
      .fetch(filepath)
      .then((res: Response) => {
        // Only the headers are needed; an unread body would keep the connection open
        res.body?.cancel().catch(() => {});

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
      let asset: AssetForTransfer;
      try {
        asset = await getAssetForTransfer(filepath, strapi, isLocalProvider);
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

      yield {
        metadata: file,
        filepath,
        filename: `${file.hash}${file.ext ?? ''}`,
        stream: asset.stream,
        stats: { size: asset.stats.size },
      };

      if (file.formats) {
        for (const format of Object.keys(file.formats)) {
          const fileFormat = file.formats[format];
          const fileFormatFilepath = isLocalProvider
            ? join(strapi.dirs.static.public, fileFormat.url)
            : fileFormat.url;
          let fileFormatAsset: AssetForTransfer;
          try {
            fileFormatAsset = await getAssetForTransfer(
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
          const metadata = { ...fileFormat, type: format, id: file.id, mainHash: file.hash };
          yield {
            metadata,
            filepath: fileFormatFilepath,
            filename: `${fileFormat.hash}${fileFormat.ext ?? ''}`,
            stream: fileFormatAsset.stream,
            stats: { size: fileFormatAsset.stats.size },
          };
        }
      }
    }
  };

  return Duplex.from(generator());
};
