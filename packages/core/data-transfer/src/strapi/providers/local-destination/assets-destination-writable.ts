import { Writable, Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../types';
import type { Transaction } from '../../../types/utils';

export interface CreateAssetsDestinationWritableOptions {
  strapi: Core.Strapi;
  transaction: Transaction;
  resolveUploadFileId: (metadata: { id: number }) => number | undefined;
  restoreMediaEntitiesContent: boolean;
  removeAssetsBackup: () => Promise<void>;
  onWarning?: (message: string) => void;
}

const resolveUploadFileIdWithHashFallback = async (
  strapi: Core.Strapi,
  uploadData: IFile,
  resolveUploadFileId: (metadata: { id: number }) => number | undefined,
  onWarning?: (message: string) => void
): Promise<number | undefined> => {
  const mappedId = resolveUploadFileId(uploadData);
  if (mappedId) {
    return mappedId;
  }

  if (!uploadData.hash) {
    return undefined;
  }

  const entry = await strapi.db.query('plugin::upload.file').findOne({
    where: { hash: uploadData.hash },
    select: ['id'],
  });

  if (entry?.id) {
    onWarning?.(
      `[Data transfer] Resolved upload file ID via hash "${uploadData.hash}" (source id ${uploadData.id} was not mapped).`
    );
    return entry.id;
  }

  return undefined;
};

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
    onWarning,
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

      if (!transaction) {
        callback(new Error('Transaction not available for asset upload'));
        return;
      }

      const bufferedChunks: Buffer[] = [];
      chunk.stream.on('data', (c: Buffer) => bufferedChunks.push(c));

      pendingUploads += 1;

      chunk.stream.once('end', () => {
        const uploadData = {
          ...chunk.metadata,
          stream: Readable.from(bufferedChunks),
          ...(chunk.buffer != null ? { buffer: chunk.buffer } : {}),
        };

        transaction
          .attach(async () => {
            try {
              const fileId = await resolveUploadFileIdWithHashFallback(
                strapi,
                uploadData,
                resolveUploadFileId,
                onWarning
              );

              await strapi.plugin('upload').provider.uploadStream(uploadData);

              if (!restoreMediaEntitiesContent) {
                return;
              }

              if (!fileId) {
                onWarning?.(
                  `[Data transfer] Uploaded asset "${chunk.filename}" but could not update the media library record (no ID mapping or hash match).`
                );
                return;
              }

              if (uploadData?.type) {
                const entry: IFile = await strapi.db.query('plugin::upload.file').findOne({
                  where: { id: fileId },
                });
                if (!entry) {
                  onWarning?.(
                    `[Data transfer] Uploaded format variant "${uploadData.type}" for "${chunk.filename}" but parent file record was not found.`
                  );
                  return;
                }
                const specificFormat = entry?.formats?.[uploadData.type];
                if (!specificFormat) {
                  onWarning?.(
                    `[Data transfer] Uploaded format variant "${uploadData.type}" for "${chunk.filename}" but no matching format entry exists in the database.`
                  );
                  return;
                }
                specificFormat.url = uploadData.url;
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
                onWarning?.(
                  `[Data transfer] Uploaded asset "${chunk.filename}" but file record was not found for URL update.`
                );
                return;
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
