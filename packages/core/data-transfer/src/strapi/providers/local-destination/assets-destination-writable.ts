import { Writable, Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../../types';
import type { Transaction } from '../../../../types/utils';

export interface CreateAssetsDestinationWritableOptions {
  strapi: Core.Strapi;
  transaction: Transaction;
  resolveUploadFileId: (metadata: { id: number }) => number | undefined;
  restoreMediaEntitiesContent: boolean;
  removeAssetsBackup: () => Promise<void>;
}

/**
 * Writable for restoring upload assets during a local push destination transfer.
 *
 * The Writable `write()` callback must return as soon as the chunk is accepted — **before**
 * `uploadStream` finishes — so the remote push handler can feed PassThrough data in the same
 * WebSocket batch after an asset `start` row (see `streamAsset` in remote `push` handler).
 */
export function createAssetsDestinationWritable(
  options: CreateAssetsDestinationWritableOptions
): Writable {
  const {
    strapi,
    transaction,
    resolveUploadFileId,
    restoreMediaEntitiesContent,
    removeAssetsBackup,
  } = options;

  let pendingUploads = 0;

  return new Writable({
    objectMode: true,
    async final(next) {
      while (pendingUploads > 0) {
        await new Promise<void>((resolve) => {
          setImmediate(resolve);
        });
      }
      await removeAssetsBackup();
      next();
    },
    write(chunk: IAsset, _encoding, callback) {
      const uploadData = {
        ...chunk.metadata,
        stream: Readable.from(chunk.stream),
        buffer: chunk?.buffer,
      };

      const provider = strapi.config.get<{ provider: string }>('plugin::upload').provider;

      const fileId = resolveUploadFileId(uploadData);
      if (!fileId) {
        callback(new Error(`File ID not found for ID: ${uploadData.id}`));
        return;
      }

      if (!transaction) {
        callback(new Error('Transaction not available for asset upload'));
        return;
      }

      pendingUploads += 1;
      transaction
        .attach(async () => {
          try {
            await strapi.plugin('upload').provider.uploadStream(uploadData);

            if (!restoreMediaEntitiesContent) {
              return;
            }

            if (uploadData?.type) {
              const entry: IFile = await strapi.db.query('plugin::upload.file').findOne({
                where: { id: fileId },
              });
              if (!entry) {
                throw new Error('file not found');
              }
              const specificFormat = entry?.formats?.[uploadData.type];
              if (specificFormat) {
                specificFormat.url = uploadData.url;
              }
              await strapi.db.query('plugin::upload.file').update({
                where: { id: entry.id },
                data: {
                  formats: entry.formats,
                  provider,
                },
              });
              return;
            }

            const entry: IFile = await strapi.db.query('plugin::upload.file').findOne({
              where: { id: fileId },
            });
            if (!entry) {
              throw new Error('file not found');
            }
            entry.url = uploadData.url;
            await strapi.db.query('plugin::upload.file').update({
              where: { id: entry.id },
              data: {
                url: entry.url,
                provider,
              },
            });
          } catch (error) {
            throw new Error(`Error while uploading asset ${chunk.filename} ${error}`);
          }
        })
        .finally(() => {
          pendingUploads -= 1;
        })
        .catch((error: unknown) => {
          const err = error instanceof Error ? error : new Error(String(error));
          process.nextTick(() => {
            this.destroy(err);
          });
        });

      callback();
    },
  });
}
