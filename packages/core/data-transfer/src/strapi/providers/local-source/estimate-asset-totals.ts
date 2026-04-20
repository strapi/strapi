import { join } from 'path';
import type { Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset, StageTotalsEstimate } from '../../../../types';

import { getFileStatsForTransfer, signUploadFileForTransfer } from './assets';

type UploadFileRecord = IAsset['metadata'];

/** Strapi stores byte size on each file record; use for remote totals to avoid per-URL HTTP. */
function hasReliableDbSize(size: unknown): size is number {
  return typeof size === 'number' && Number.isFinite(size) && size >= 0;
}

/** When every main + format has a DB size, remote rows need no signing or HTTP stat. */
function remoteRowCanUseDbOnly(file: UploadFileRecord): boolean {
  if (!hasReliableDbSize(file.size)) {
    return false;
  }
  if (!file.formats) {
    return true;
  }
  for (const key of Object.keys(file.formats)) {
    if (!hasReliableDbSize(file.formats[key].size)) {
      return false;
    }
  }
  return true;
}

/**
 * Sum sizes and counts for the same asset rows `createAssetsStream` would yield (main + formats),
 * skipping missing files with ENOENT like the stream does. Used for transfer progress totals / ETA.
 *
 * - **Local (`provider === 'local'`):** `stat` on disk (source of truth; matches ENOENT skips).
 * - **Remote:** sum `size` from DB when present on main and every format; otherwise sign + `fetch` / `Content-Length` like before.
 */
export async function estimateAssetTotals(strapi: Core.Strapi): Promise<StageTotalsEstimate> {
  let totalBytes = 0;
  let totalCount = 0;

  const stream: Readable = strapi.db.queryBuilder('plugin::upload.file').select('*').stream();

  for await (const file of stream) {
    const isLocalProvider = file.provider === 'local';

    if (isLocalProvider) {
      const filepath = join(strapi.dirs.static.public, file.url);
      try {
        const stats = await getFileStatsForTransfer(filepath, strapi, true);
        totalBytes += stats.size;
        totalCount += 1;
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? (err as NodeJS.ErrnoException).code
            : undefined;
        if (code === 'ENOENT') {
          strapi.log.warn(`[Data transfer] Skipping missing asset file: ${filepath}`);
          continue;
        }
        throw err;
      }

      if (file.formats) {
        for (const format of Object.keys(file.formats)) {
          const fileFormat = file.formats[format];
          const fileFormatFilepath = join(strapi.dirs.static.public, fileFormat.url);
          try {
            const fileFormatStats = await getFileStatsForTransfer(fileFormatFilepath, strapi, true);
            totalBytes += fileFormatStats.size;
            totalCount += 1;
          } catch (err: unknown) {
            const code =
              err && typeof err === 'object' && 'code' in err
                ? (err as NodeJS.ErrnoException).code
                : undefined;
            if (code === 'ENOENT') {
              strapi.log.warn(`[Data transfer] Skipping missing asset file: ${fileFormatFilepath}`);
              continue;
            }
            throw err;
          }
        }
      }

      continue;
    }

    // Remote: prefer DB sizes (fast); fall back to signed URL + HTTP where `size` is missing.
    if (remoteRowCanUseDbOnly(file)) {
      totalBytes += file.size;
      totalCount += 1;
      if (file.formats) {
        for (const format of Object.keys(file.formats)) {
          totalBytes += file.formats[format].size;
          totalCount += 1;
        }
      }
      continue;
    }

    await signUploadFileForTransfer(strapi, file);

    if (hasReliableDbSize(file.size)) {
      totalBytes += file.size;
      totalCount += 1;
    } else {
      try {
        const stats = await getFileStatsForTransfer(file.url, strapi, false);
        totalBytes += stats.size;
        totalCount += 1;
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? (err as NodeJS.ErrnoException).code
            : undefined;
        if (code === 'ENOENT') {
          strapi.log.warn(`[Data transfer] Skipping missing asset file: ${file.url}`);
          continue;
        }
        throw err;
      }
    }

    if (file.formats) {
      for (const format of Object.keys(file.formats)) {
        const fileFormat = file.formats[format];
        const fileFormatFilepath = fileFormat.url;

        if (hasReliableDbSize(fileFormat.size)) {
          totalBytes += fileFormat.size;
          totalCount += 1;
        } else {
          try {
            const fileFormatStats = await getFileStatsForTransfer(
              fileFormatFilepath,
              strapi,
              false
            );
            totalBytes += fileFormatStats.size;
            totalCount += 1;
          } catch (err: unknown) {
            const code =
              err && typeof err === 'object' && 'code' in err
                ? (err as NodeJS.ErrnoException).code
                : undefined;
            if (code === 'ENOENT') {
              strapi.log.warn(`[Data transfer] Skipping missing asset file: ${fileFormatFilepath}`);
              continue;
            }
            throw err;
          }
        }
      }
    }
  }

  return { totalBytes, totalCount };
}
