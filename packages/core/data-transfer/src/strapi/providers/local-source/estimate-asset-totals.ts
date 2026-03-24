import { join } from 'path';
import type { Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { StageTotalsEstimate } from '../../../../types';

import { getFileStatsForTransfer, signUploadFileForTransfer } from './assets';

/**
 * Sum sizes and counts for the same asset rows `createAssetsStream` would yield (main + formats),
 * skipping missing files with ENOENT like the stream does. Used for transfer progress totals / ETA.
 */
export async function estimateAssetTotals(strapi: Core.Strapi): Promise<StageTotalsEstimate> {
  let totalBytes = 0;
  let totalCount = 0;

  const stream: Readable = strapi.db.queryBuilder('plugin::upload.file').select('*').stream();

  for await (const file of stream) {
    const isLocalProvider = file.provider === 'local';
    if (!isLocalProvider) {
      await signUploadFileForTransfer(strapi, file);
    }
    const filepath = isLocalProvider ? join(strapi.dirs.static.public, file.url) : file.url;
    try {
      const stats = await getFileStatsForTransfer(filepath, strapi, isLocalProvider);
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
        const fileFormatFilepath = isLocalProvider
          ? join(strapi.dirs.static.public, fileFormat.url)
          : fileFormat.url;
        try {
          const fileFormatStats = await getFileStatsForTransfer(
            fileFormatFilepath,
            strapi,
            isLocalProvider
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

  return { totalBytes, totalCount };
}
