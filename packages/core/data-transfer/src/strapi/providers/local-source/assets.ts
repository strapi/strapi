import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { Duplex, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { stat, createReadStream, createWriteStream, mkdtemp, rm } from 'fs-extra';
import * as webStream from 'stream/web';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../types';

/**
 * Read the size of a file to transfer.
 *
 * For local files this is a plain `fs.stat`. For remote files it reads the
 * `content-length` header — which is only an ESTIMATE for cloud providers (it
 * can be missing on chunked responses, or reflect a compressed size). It is
 * therefore used for progress estimation only; the actual transfer measures the
 * real byte size on disk (see `createAssetsStream`).
 */
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

interface AssetSource {
  size: number;
  stream: Readable;
}

const isMissingFileError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as NodeJS.ErrnoException).code === 'ENOENT';

/**
 * Download a remote asset (e.g. Cloudinary/S3) to a temp file and return its
 * real size + a stream that reads from disk.
 *
 * A tar entry needs the EXACT byte size before any bytes are written, and the
 * remote `content-length` is unreliable for cloud providers (missing on chunked
 * responses, or the compressed size while `fetch` yields the decompressed body).
 * Downloading to a temp file lets us measure the real size with `fs.stat` and
 * avoids buffering the whole asset in memory (important for large media).
 *
 * The temp file removes itself once its stream closes; the enclosing temp
 * directory is removed when the export finishes (see `createAssetsStream`).
 */
async function openRemoteAssetToTemp(
  filepath: string,
  strapi: Core.Strapi,
  tmpDir: string
): Promise<AssetSource> {
  const res = await strapi.fetch(filepath);
  if (res.status !== 200) {
    throw new Error(`Request failed with status code ${res.status}`);
  }
  if (!res.body) {
    throw new Error('Empty data found for file');
  }

  const tmpFile = join(tmpDir, randomBytes(16).toString('hex'));

  await pipeline(
    Readable.fromWeb(res.body as webStream.ReadableStream<Uint8Array>),
    createWriteStream(tmpFile)
  );

  const { size } = await stat(tmpFile);
  const stream = createReadStream(tmpFile);

  // Remove the temp file as soon as its stream is fully read (or errors). The
  // whole temp dir is also removed when the export ends, as a safety net.
  stream.on('close', () => {
    rm(tmpFile, { force: true }).catch(() => {
      /* best-effort */
    });
  });

  return { size, stream };
}

/**
 * Open an asset for transfer, returning its exact size and a readable stream.
 * Local files are read straight from disk; remote files are downloaded to a
 * temp file first so the size is exact (see `openRemoteAssetToTemp`).
 */
async function openAssetForTransfer(
  filepath: string,
  strapi: Core.Strapi,
  isLocal: boolean,
  ensureTmpDir: () => Promise<string>
): Promise<AssetSource> {
  if (isLocal) {
    const { size } = await stat(filepath);
    return { size, stream: createReadStream(filepath) };
  }

  const tmpDir = await ensureTmpDir();
  return openRemoteAssetToTemp(filepath, strapi, tmpDir);
}

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

  const generator: () => AsyncGenerator<IAsset, void> = async function* () {
    // Remote assets are downloaded to a temp directory so their exact on-disk
    // size can be used for the tar entry. It is created lazily (only when a
    // remote asset is encountered) and removed in the `finally` below — which
    // runs on normal completion, on error, and when the export is aborted
    // mid-way (Duplex.from calls this generator's return()).
    let tmpDir: string | undefined;
    const ensureTmpDir = async (): Promise<string> => {
      if (!tmpDir) {
        tmpDir = await mkdtemp(join(tmpdir(), 'strapi-export-assets-'));
      }
      return tmpDir;
    };

    try {
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

        let asset: AssetSource;
        try {
          asset = await openAssetForTransfer(filepath, strapi, isLocalProvider, ensureTmpDir);
        } catch (err: unknown) {
          if (isMissingFileError(err)) {
            warnMissingAsset(missingAssetWarningMessage(file, filepath));
            continue;
          }
          throw err;
        }

        yield {
          metadata: file,
          filepath,
          filename: file.hash + file.ext,
          stream: asset.stream,
          stats: { size: asset.size },
        };

        if (file.formats) {
          for (const format of Object.keys(file.formats)) {
            const fileFormat = file.formats[format];
            const fileFormatFilepath = isLocalProvider
              ? join(strapi.dirs.static.public, fileFormat.url)
              : fileFormat.url;

            let fileFormatAsset: AssetSource;
            try {
              fileFormatAsset = await openAssetForTransfer(
                fileFormatFilepath,
                strapi,
                isLocalProvider,
                ensureTmpDir
              );
            } catch (err: unknown) {
              if (isMissingFileError(err)) {
                warnMissingAsset(missingAssetWarningMessage(file, fileFormatFilepath, format));
                continue;
              }
              throw err;
            }

            const metadata = { ...fileFormat, type: format, id: file.id, mainHash: file.hash };
            yield {
              metadata,
              filepath: fileFormatFilepath,
              filename: fileFormat.hash + fileFormat.ext,
              stream: fileFormatAsset.stream,
              stats: { size: fileFormatAsset.size },
            };
          }
        }
      }
    } finally {
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {
          /* best-effort cleanup */
        });
      }
    }
  };

  return Duplex.from(generator());
};
