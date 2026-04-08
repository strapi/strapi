/**
 * Negotiated `maxBatchSize` (MiB; see user docs) → per-message batch byte limits.
 * Does not cap total process RSS — only sizes WebSocket batches (assets + JSON stages).
 */

import { transferAssetStreamChunkByteLength } from './transfer-asset-chunk';

/** Legacy default batch size when neither peer sets maxBatchSize (matches pre-negotiation behavior). */
export const LEGACY_BATCH_BYTES = 1024 * 1024;

/** Upper bound for the `maxBatchSize` option (value is in MiB). */
export const MAX_BATCH_SIZE_LIMIT_MIB = 16384;

const MIB = 1024 * 1024;

const ASSET_SIZE_DIVISOR = 64;
const JSON_SIZE_DIVISOR = 48;

const MIN_BATCH_BYTES = 64 * 1024;
const MAX_BATCH_BYTES = LEGACY_BATCH_BYTES;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Parse optional config/CLI value into a finite MiB `maxBatchSize`, or undefined if invalid/omitted.
 */
export function parseOptionalMaxBatchSize(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_BATCH_SIZE_LIMIT_MIB) {
    return undefined;
  }
  return n;
}

/**
 * Both peers may omit maxBatchSize (= no preference). Returns null if both omitted (legacy batching).
 */
export function negotiateAgreedMaxBatchSize(
  clientMiB: number | undefined,
  serverMiB: number | undefined
): number | null {
  if (clientMiB == null && serverMiB == null) {
    return null;
  }
  const c = clientMiB ?? Number.POSITIVE_INFINITY;
  const s = serverMiB ?? Number.POSITIVE_INFINITY;
  return Math.min(c, s);
}

export function batchLimitsFromAgreedMaxBatchSize(agreedMaxBatchSizeMiB: number | null): {
  assetBatchMaxBytes: number;
  jsonBatchMaxBytes: number;
} {
  if (agreedMaxBatchSizeMiB == null) {
    return { assetBatchMaxBytes: LEGACY_BATCH_BYTES, jsonBatchMaxBytes: LEGACY_BATCH_BYTES };
  }
  const budgetBytes = agreedMaxBatchSizeMiB * MIB;
  return {
    assetBatchMaxBytes: clamp(
      Math.floor(budgetBytes / ASSET_SIZE_DIVISOR),
      MIN_BATCH_BYTES,
      MAX_BATCH_BYTES
    ),
    jsonBatchMaxBytes: clamp(
      Math.floor(budgetBytes / JSON_SIZE_DIVISOR),
      MIN_BATCH_BYTES,
      MAX_BATCH_BYTES
    ),
  };
}

/** Sum decoded asset stream bytes represented in a pull/push asset batch (start/end contribute 0). */
export function totalDecodedBytesInAssetFlow(
  items: ReadonlyArray<{ action: string; data?: unknown; encoding?: 'base64' }>
): number {
  let sum = 0;
  for (const item of items) {
    sum += transferAssetStreamChunkByteLength(item);
  }
  return sum;
}

/**
 * Assert a non-assets transfer payload does not exceed the negotiated JSON batch limit (serialized size).
 */
export function assertJsonBatchWithinLimit(data: unknown, jsonBatchMaxBytes: number): void {
  const n = Buffer.byteLength(JSON.stringify(data));
  if (n > jsonBatchMaxBytes) {
    throw new Error(
      `[Data transfer] Batch exceeds negotiated jsonBatchMaxBytes (${n} > ${jsonBatchMaxBytes}). Align maxBatchSize settings or upgrade the peer.`
    );
  }
}

/**
 * Assert an asset flow batch does not exceed the negotiated decoded-byte limit.
 */
export function assertAssetFlowBatchWithinLimit(
  items: ReadonlyArray<{ action: string; data?: unknown; encoding?: 'base64' }>,
  assetBatchMaxBytes: number
): void {
  const n = totalDecodedBytesInAssetFlow(items);
  if (n > assetBatchMaxBytes) {
    throw new Error(
      `[Data transfer] Asset batch exceeds negotiated assetBatchMaxBytes (${n} > ${assetBatchMaxBytes}). Align maxBatchSize settings or upgrade the peer.`
    );
  }
}
