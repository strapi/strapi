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
 * Design constraints:
 * 1. The `write()` callback must return **before** `uploadStream` finishes so the remote push
 *    handler can continue feeding chunks to the PassThrough stream in the same WebSocket batch
 *    (avoids deadlock — see `streamAsset` in the remote push handler).
 * 2. `uploadStream` is only called **after** the PassThrough has been fully drained (all chunks
 *    received and the stream ended). This gives the upload provider a pre-filled synchronous
 *    Readable rather than a lazy async wrapper, which avoids `Buffer.from(undefined)` crashes
 *    in upload providers that call `stream.read()` before any data has been buffered.
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
      const provider = strapi.config.get<{ provider: string }>('plugin::upload').provider;

      const fileId = resolveUploadFileId(chunk.metadata);
      if (!fileId) {
        callback(new Error(`File ID not found for ID: ${chunk.metadata.id}`));
        return;
      }

      if (!transaction) {
        callback(new Error('Transaction not available for asset upload'));
        return;
      }

      // Accumulate all binary chunks from the PassThrough as they arrive (flowing mode).
      // uploadStream is only started once the stream ends — see constraint (2) above.
      const bufferedChunks: Buffer[] = [];
      chunk.stream.on('data', (c: Buffer) => bufferedChunks.push(c));

      pendingUploads += 1;

      chunk.stream.once('end', () => {
        // Build uploadData here so the stream is fully populated before the provider reads it.
        const uploadData = {
          ...chunk.metadata,
          stream: Readable.from(bufferedChunks),
          ...(chunk.buffer != null ? { buffer: chunk.buffer } : {}),
        };

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
      });

      chunk.stream.once('error', (err) => {
        pendingUploads -= 1;
        process.nextTick(() => this.destroy(err));
      });

      callback();
    },
  });
}
