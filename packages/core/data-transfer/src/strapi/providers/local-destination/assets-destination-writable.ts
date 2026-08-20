import { Writable, Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../types';
import type { Transaction } from '../../../types/utils';
import { createCappedWarningReporter } from '../../../utils/capped-warnings';

/** A media library row, or one of the responsive formats stored inside it. */
interface UploadHashTarget {
  id: number;
  format?: string;
}

type HashIndexEntry = UploadHashTarget | 'ambiguous';
type UploadHashIndex = Map<string, HashIndexEntry>;

const isSameTarget = (a: UploadHashTarget, b: UploadHashTarget) =>
  a.id === b.id && a.format === b.format;

/**
 * Index the exact hashes the destination knows about: the row hash for original files, plus
 * every `formats[*].hash`. The hash alone then identifies both the row and the format it
 * belongs to, which filename prefix parsing cannot do (custom breakpoints are unknown, and an
 * original named `small_logo.png` looks like a `small` variant).
 */
const loadUploadHashIndex = async (strapi: Core.Strapi): Promise<UploadHashIndex> => {
  const entries: IFile[] = await strapi.db.query('plugin::upload.file').findMany({
    select: ['id', 'hash', 'formats'],
  });

  const index: UploadHashIndex = new Map();

  const addHash = (hash: string | undefined, target: UploadHashTarget) => {
    if (!hash) {
      return;
    }
    const existing = index.get(hash);
    if (existing === undefined) {
      index.set(hash, target);
      return;
    }
    if (existing !== 'ambiguous' && !isSameTarget(existing, target)) {
      index.set(hash, 'ambiguous');
    }
  };

  for (const entry of entries) {
    if (entry?.id == null) {
      continue;
    }
    addHash(entry.hash, { id: entry.id });
    for (const [format, data] of Object.entries(entry.formats ?? {})) {
      addHash(data?.hash, { id: entry.id, format });
    }
  }

  return index;
};

export interface CreateAssetsDestinationWritableOptions {
  strapi: Core.Strapi;
  transaction: Transaction;
  resolveUploadFileId: (metadata: { id: number }) => number | undefined;
  restoreMediaEntitiesContent: boolean;
  removeAssetsBackup: () => Promise<void>;
  onWarning?: (message: string) => void;
}

const resolveUploadTarget = async (
  uploadData: IFile,
  resolveUploadFileId: (metadata: { id: number }) => number | undefined,
  getHashIndex: () => Promise<UploadHashIndex>,
  warn: (message: string) => void,
  counts: { resolved: number; ambiguous: number }
): Promise<UploadHashTarget | undefined> => {
  const mappedId = resolveUploadFileId(uploadData);
  if (mappedId) {
    return { id: mappedId, format: uploadData.type };
  }

  // The asset's own hash is tried first because the index resolves it to an exact target.
  // `mainHash` is the parent hash sent with responsive variants: a fallback for variants whose
  // hash the destination does not know (formats regenerated with different hashes).
  const lookupHashes = [uploadData.hash, uploadData.mainHash].filter(
    (hash, position, all): hash is string => Boolean(hash) && all.indexOf(hash) === position
  );

  if (lookupHashes.length === 0) {
    return undefined;
  }

  const index = await getHashIndex();
  let ambiguousHash: string | undefined;

  for (const lookupHash of lookupHashes) {
    const match = index.get(lookupHash);

    if (match === 'ambiguous') {
      ambiguousHash ??= lookupHash;
      continue;
    }

    if (match) {
      counts.resolved += 1;
      warn(
        `[Data transfer] Resolved upload file ID via hash "${lookupHash}" (source id ${uploadData.id} was not mapped).`
      );

      if (lookupHash === uploadData.hash) {
        // The index knows whether this hash is an original file or one of its formats.
        return { id: match.id, format: match.format };
      }

      // Matched through the parent hash, so this asset is a variant of the resolved row.
      return { id: match.id, format: match.format ?? uploadData.type };
    }
  }

  if (ambiguousHash) {
    counts.ambiguous += 1;
    warn(
      `[Data transfer] Ambiguous hash "${ambiguousHash}" matched multiple media library records; skipping database URL update (source id ${uploadData.id} was not mapped).`
    );
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
  let hashIndexPromise: Promise<UploadHashIndex> | undefined;
  const hashFallbackCounts = { resolved: 0, ambiguous: 0, unmatched: 0 };
  const warnings = createCappedWarningReporter(onWarning);

  const getHashIndex = () => {
    if (!hashIndexPromise) {
      hashIndexPromise = loadUploadHashIndex(strapi);
    }
    return hashIndexPromise;
  };

  return new Writable({
    objectMode: true,
    async final(next) {
      while (pendingUploads > 0) {
        await new Promise<void>((resolve) => {
          setImmediate(resolve);
        });
      }
      const { resolved, ambiguous, unmatched } = hashFallbackCounts;
      if (resolved + ambiguous + unmatched > 0) {
        onWarning?.(
          `[Data transfer] Asset hash fallback summary: ${resolved} resolved, ${ambiguous} ambiguous, ${unmatched} unmatched.`
        );
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
              // Hash fallback is only useful when we will update media-library rows.
              // With --only files, restoreMediaEntitiesContent is false: upload bytes only.
              const target = restoreMediaEntitiesContent
                ? await resolveUploadTarget(
                    uploadData,
                    resolveUploadFileId,
                    getHashIndex,
                    (message) => warnings.warn(message),
                    hashFallbackCounts
                  )
                : undefined;

              await strapi.plugin('upload').provider.uploadStream(uploadData);

              if (!restoreMediaEntitiesContent) {
                return;
              }

              if (!target) {
                hashFallbackCounts.unmatched += 1;
                warnings.warn(
                  `[Data transfer] Uploaded asset "${chunk.filename}" but could not update the media library record (no ID mapping or hash match).`
                );
                return;
              }

              const entry: IFile = await strapi.db.query('plugin::upload.file').findOne({
                where: { id: target.id },
              });
              if (!entry) {
                warnings.warn(
                  target.format
                    ? `[Data transfer] Uploaded format variant "${target.format}" for "${chunk.filename}" but parent file record was not found.`
                    : `[Data transfer] Uploaded asset "${chunk.filename}" but file record was not found for URL update.`
                );
                return;
              }

              if (target.format) {
                const specificFormat = entry.formats?.[target.format];
                if (!specificFormat) {
                  warnings.warn(
                    `[Data transfer] Uploaded format variant "${target.format}" for "${chunk.filename}" but no matching format entry exists in the database.`
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
