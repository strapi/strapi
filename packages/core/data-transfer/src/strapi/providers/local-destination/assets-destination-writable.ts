import { Writable, Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset, IFile } from '../../../types';
import type { Transaction } from '../../../types/utils';
import { createCappedWarningReporter } from '../../../utils/capped-warnings';

/** What the destination stores about an object's bytes, used to sanity-check a hash match. */
interface BytesDescriptor {
  ext?: string;
  size?: number;
}

/** A media library row, or one of the responsive formats stored inside it. */
interface UploadHashTarget {
  id: number;
  format?: string;
  bytes?: BytesDescriptor;
}

type UploadHashIndex = Map<string, UploadHashTarget[]>;

const isSameTarget = (a: UploadHashTarget, b: UploadHashTarget) =>
  a.id === b.id && a.format === b.format;

/** `size` is a decimal column, so a driver may hand it back as a string. */
const toKbytes = (size: unknown): number | undefined => {
  const value = Number(size);

  return size != null && Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
};

const describeBytes = (object: IFile): BytesDescriptor => ({
  ext: object.ext ?? undefined,
  size: toKbytes(object.size),
});

/**
 * Whether a hash match may name the incoming bytes. `hash` is a filename identifier — a slug
 * plus a random suffix — not a content digest, so an equal hash is strong evidence, never proof,
 * that two objects hold the same bytes. `ext` and `size` make the match verifiable for a
 * missing-sidecar asset: both are read from the archived object itself (assets are exported as
 * `hash + ext`, and the size is the byte length), so a stored value that contradicts them
 * belongs to a different file that happens to share the identifier. `mime` is not compared —
 * filename-derived metadata infers it from the extension, so a mismatch there says nothing
 * about the bytes. Values the destination does not store contradict nothing.
 */
const mayHoldSameBytes = (target: UploadHashTarget, asset: IFile): boolean => {
  const contradicts = (stored?: string | number, incoming?: string | number) =>
    stored !== undefined && incoming !== undefined && stored !== incoming;

  return !(
    contradicts(target.bytes?.ext, asset.ext) ||
    contradicts(target.bytes?.size, toKbytes(asset.size))
  );
};

/** Where a provider writes an object: the S3 key prefix / Cloudinary folder, and its identity. */
interface ProviderPlacement {
  path?: string;
  provider_metadata?: Record<string, unknown>;
}

/**
 * Index the exact hashes the destination knows about: the row hash for original files, plus
 * every `formats[*].hash`. The hash alone then identifies both the row and the format it
 * belongs to, which filename prefix parsing cannot do (custom breakpoints are unknown, and an
 * original named `small_logo.png` looks like a `small` variant).
 */
const loadUploadHashIndex = async (strapi: Core.Strapi): Promise<UploadHashIndex> => {
  const entries: IFile[] = await strapi.db.query('plugin::upload.file').findMany({
    select: ['id', 'hash', 'ext', 'size', 'formats'],
  });

  const index: UploadHashIndex = new Map();

  const addHash = (hash: string | undefined, target: UploadHashTarget) => {
    if (!hash) {
      return;
    }
    const targets = index.get(hash);
    if (!targets) {
      index.set(hash, [target]);
      return;
    }
    if (!targets.some((existing) => isSameTarget(existing, target))) {
      targets.push(target);
    }
  };

  for (const entry of entries) {
    if (entry?.id == null) {
      continue;
    }
    addHash(entry.hash, { id: entry.id, bytes: describeBytes(entry) });
    for (const [format, data] of Object.entries(entry.formats ?? {})) {
      addHash(data?.hash, { id: entry.id, format, bytes: data ? describeBytes(data) : undefined });
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

/**
 * How an asset was matched to the destination: through the ID map, through a hash that belongs
 * to exactly one object, or through a hash several objects share. An ambiguous match keeps its
 * candidates — it cannot pick a row to update, but it still describes every provider key the
 * bytes may belong at. A `mismatch` is a hash the destination knows whose objects all describe
 * different bytes, which is not a match at all: the shared identifier is a coincidence.
 */
type UploadResolution =
  | { kind: 'mapped'; target: UploadHashTarget }
  | { kind: 'hash'; hash: string; target: UploadHashTarget }
  | { kind: 'ambiguous'; hash: string; targets: UploadHashTarget[] }
  | { kind: 'mismatch'; hash: string; count: number };

const resolveUploadTarget = async (
  uploadData: IFile,
  metadataFallback: boolean,
  resolveUploadFileId: (metadata: { id: number }) => number | undefined,
  getHashIndex: () => Promise<UploadHashIndex>
): Promise<UploadResolution | undefined> => {
  const mappedId = resolveUploadFileId(uploadData);
  if (mappedId) {
    return { kind: 'mapped', target: { id: mappedId, format: uploadData.type } };
  }

  // The asset's own hash is tried first because the index resolves it to an exact target.
  // `mainHash` is the parent hash sent with responsive variants: a fallback for variants whose
  // hash the destination does not know (formats regenerated with different hashes). A missing
  // sidecar cannot prove that a filename prefix denotes a variant, so do not use its inferred
  // `mainHash` to select a row.
  const lookupHashes = [uploadData.hash, ...(metadataFallback ? [] : [uploadData.mainHash])].filter(
    (hash, position, all): hash is string => Boolean(hash) && all.indexOf(hash) === position
  );

  if (lookupHashes.length === 0) {
    return undefined;
  }

  const index = await getHashIndex();

  for (const lookupHash of lookupHashes) {
    const targets = index.get(lookupHash);

    if (!targets?.length) {
      continue;
    }

    // Filename-derived metadata carries no ID, so the hash is the only claim that an object is
    // this asset. Drop the objects whose stored bytes contradict it before deciding.
    const candidates = metadataFallback
      ? targets.filter((target) => mayHoldSameBytes(target, uploadData))
      : targets;

    if (candidates.length === 0) {
      return { kind: 'mismatch', hash: lookupHash, count: targets.length };
    }

    if (candidates.length > 1) {
      return { kind: 'ambiguous', hash: lookupHash, targets: candidates };
    }

    const [match] = candidates;

    // For the asset's own hash the index knows whether it is an original file or one of its
    // formats; a match through the parent hash makes this asset a variant of that row.
    const format =
      lookupHash === uploadData.hash ? match.format : (match.format ?? uploadData.type);

    return { kind: 'hash', hash: lookupHash, target: { id: match.id, format } };
  }

  return undefined;
};

/**
 * Where the destination stores a given original or format. `path` belongs to the row, while
 * `provider_metadata` identifies one object, so the latter is only read from the exact object
 * being restored.
 */
const placementOf = (entry: IFile, format?: string): ProviderPlacement => {
  const object = format ? entry.formats?.[format] : entry;

  return { path: object?.path ?? entry.path, provider_metadata: object?.provider_metadata };
};

/**
 * Filename-derived metadata carries no `path` or `provider_metadata`, so a path-keyed provider
 * (AWS S3 keys objects as `path/hash.ext`, Cloudinary uses `path` as the folder) would write an
 * object that the stored URL does not name. Recover the placement from the destination row
 * before the bytes are uploaded.
 */
const applyProviderPlacement = (uploadData: IFile, placement: ProviderPlacement) => {
  if (uploadData.path === undefined && placement.path !== undefined) {
    uploadData.path = placement.path;
  }

  if (uploadData.provider_metadata === undefined && placement.provider_metadata !== undefined) {
    uploadData.provider_metadata = placement.provider_metadata;
  }
};

/**
 * The distinct provider placements of the objects that share a hash. Objects sharing a hash and
 * agreeing on `ext` and `size` are taken to share the bytes — a best-effort equivalence (see
 * `mayHoldSameBytes`), not a proven one — so an ambiguous match still describes a usable *set*
 * of keys: restoring the asset at each of them makes every record naming one of those keys whole
 * again, without picking a row. Grouped by `path` because that is what decides the key on
 * path-keyed providers; a shared path cannot carry one object's `provider_metadata`.
 */
const loadCandidatePlacements = async (
  strapi: Core.Strapi,
  targets: UploadHashTarget[]
): Promise<ProviderPlacement[]> => {
  const byPath = new Map<string, { placement: ProviderPlacement; owners: number }>();

  for (const target of targets) {
    const entry: IFile | null = await strapi.db.query('plugin::upload.file').findOne({
      where: { id: target.id },
    });

    if (!entry) {
      continue;
    }

    const placement = placementOf(entry, target.format);
    const existing = byPath.get(placement.path ?? '');

    if (existing) {
      existing.owners += 1;
      continue;
    }

    byPath.set(placement.path ?? '', { placement, owners: 1 });
  }

  return [...byPath.values()].map(({ placement, owners }) =>
    owners === 1 ? placement : { path: placement.path }
  );
};

/**
 * Placement recovery for a files-only restore of a missing-sidecar asset. Rows are never
 * mutated here, so the only thing that can go wrong is writing the bytes at a key no stored URL
 * names — hence every candidate key is returned rather than a single guess. An unmatched hash
 * has no candidate, but it also means no record names the object: the archive filename *is* the
 * exported provider key (`hash + ext`), so a hash the destination does not know cannot be
 * referenced by any row or format URL. A hash whose objects all describe different bytes is
 * treated the same way — none of their keys belongs to this asset.
 */
const recoverFallbackPlacements = async (options: {
  strapi: Core.Strapi;
  filename: string;
  hash: string;
  resolution: UploadResolution | undefined;
  warn: (message: string) => void;
  counts: { resolved: number; ambiguous: number; unmatched: number };
}): Promise<ProviderPlacement[]> => {
  const { strapi, filename, hash, resolution, warn, counts } = options;

  const candidates: UploadHashTarget[] = [];
  if (resolution?.kind === 'ambiguous') {
    candidates.push(...resolution.targets);
  } else if (resolution?.kind === 'mapped' || resolution?.kind === 'hash') {
    candidates.push(resolution.target);
  }

  const placements = await loadCandidatePlacements(strapi, candidates);

  if (placements.length === 0) {
    counts.unmatched += 1;
    warn(
      resolution?.kind === 'mismatch'
        ? `[Data transfer] Uploaded "${filename}" without its provider path metadata: the sidecar was missing and the ${resolution.count} media library record(s) sharing hash "${hash}" describe different bytes (ext or size mismatch), so none of their provider paths names this object. The bytes were restored at the provider default key.`
        : `[Data transfer] Uploaded "${filename}" without its provider path metadata: the sidecar was missing and hash "${hash}" matches no media library record, so no stored URL names this object. The bytes were restored at the provider default key.`
    );
    return [{}];
  }

  if (resolution?.kind === 'ambiguous') {
    counts.ambiguous += 1;
    warn(
      placements.length > 1
        ? `[Data transfer] Ambiguous hash "${hash}" matched media library records stored under ${placements.length} different provider paths; restoring "${filename}" at each of them (same hash, same ext and size) so no record is left naming a deleted object.`
        : `[Data transfer] Ambiguous hash "${hash}" matched multiple media library records resolving to one provider path; restored "${filename}" at that path.`
    );
    return placements;
  }

  if (resolution?.kind === 'hash') {
    counts.resolved += 1;
    warn(
      `[Data transfer] Recovered provider path metadata via hash "${hash}" for "${filename}" (media library records are left unchanged).`
    );
  }

  return placements;
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
        const createUploadData = (placement?: ProviderPlacement) => {
          const uploadData = {
            ...chunk.metadata,
            stream: Readable.from(bufferedChunks),
            ...(chunk.buffer != null ? { buffer: chunk.buffer } : {}),
          };

          if (placement) {
            applyProviderPlacement(uploadData, placement);
          }

          return uploadData;
        };

        transaction
          .attach(async () => {
            try {
              // A row is resolved to update its URL, and — with --only files, where rows are
              // never touched — to recover the provider placement metadata that a missing
              // sidecar could not supply.
              const resolution =
                restoreMediaEntitiesContent || chunk.metadataFallback
                  ? await resolveUploadTarget(
                      chunk.metadata,
                      chunk.metadataFallback ?? false,
                      resolveUploadFileId,
                      getHashIndex
                    )
                  : undefined;

              if (!restoreMediaEntitiesContent) {
                // The destination objects were deleted in beforeTransfer and the backup is
                // dropped when the stage finishes, so the bytes are always restored — at every
                // key the destination may name them by when the sidecar is missing.
                const placements = chunk.metadataFallback
                  ? await recoverFallbackPlacements({
                      strapi,
                      filename: chunk.filename,
                      hash: chunk.metadata.hash,
                      resolution,
                      warn: (message) => warnings.warn(message),
                      counts: hashFallbackCounts,
                    })
                  : [undefined];

                for (const placement of placements) {
                  await strapi.plugin('upload').provider.uploadStream(createUploadData(placement));
                }

                return;
              }

              if (resolution?.kind === 'ambiguous') {
                hashFallbackCounts.ambiguous += 1;
                warnings.warn(
                  `[Data transfer] Ambiguous hash "${resolution.hash}" matched multiple media library records; skipping database URL update (source id ${chunk.metadata.id} was not mapped).`
                );
              } else if (resolution?.kind === 'hash') {
                hashFallbackCounts.resolved += 1;
                warnings.warn(
                  `[Data transfer] Resolved upload file ID via hash "${resolution.hash}" (source id ${chunk.metadata.id} was not mapped).`
                );
              }

              const resolvedTarget =
                resolution?.kind === 'mapped' || resolution?.kind === 'hash'
                  ? resolution.target
                  : undefined;
              const entry: IFile | null = resolvedTarget
                ? await strapi.db.query('plugin::upload.file').findOne({
                    where: { id: resolvedTarget.id },
                  })
                : null;

              const uploadData = createUploadData(
                chunk.metadataFallback && resolvedTarget && entry
                  ? placementOf(entry, resolvedTarget.format)
                  : undefined
              );

              await strapi.plugin('upload').provider.uploadStream(uploadData);
              // Providers may replace provider_metadata (Cloudinary) or mutate it in place.
              // Persisting any defined post-upload value covers both styles; rewriting an
              // unchanged hydrated value is harmless.
              const providerMetadata = uploadData.provider_metadata;

              if (resolution?.kind === 'ambiguous') {
                return;
              }

              if (!resolvedTarget) {
                hashFallbackCounts.unmatched += 1;
                warnings.warn(
                  resolution?.kind === 'mismatch'
                    ? `[Data transfer] Uploaded asset "${chunk.filename}" but did not update any media library record: the sidecar was missing and the ${resolution.count} record(s) sharing hash "${resolution.hash}" describe different bytes (ext or size mismatch).`
                    : `[Data transfer] Uploaded asset "${chunk.filename}" but could not update the media library record (no ID mapping or hash match).`
                );
                return;
              }

              if (!entry) {
                warnings.warn(
                  resolvedTarget.format
                    ? `[Data transfer] Uploaded format variant "${resolvedTarget.format}" for "${chunk.filename}" but parent file record was not found.`
                    : `[Data transfer] Uploaded asset "${chunk.filename}" but file record was not found for URL update.`
                );
                return;
              }

              if (resolvedTarget.format) {
                const specificFormat = entry.formats?.[resolvedTarget.format];
                if (!specificFormat) {
                  warnings.warn(
                    `[Data transfer] Uploaded format variant "${resolvedTarget.format}" for "${chunk.filename}" but no matching format entry exists in the database.`
                  );
                  return;
                }
                specificFormat.url = uploadData.url;
                if (providerMetadata !== undefined) {
                  specificFormat.provider_metadata = providerMetadata;
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

              entry.url = uploadData.url;
              await strapi.db.query('plugin::upload.file').update({
                where: { id: entry.id },
                data: {
                  url: entry.url,
                  provider,
                  ...(providerMetadata !== undefined
                    ? { provider_metadata: providerMetadata }
                    : {}),
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
