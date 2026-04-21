/**
 * Canonical **outbound** asset chunk for WebSocket JSON (push and pull).
 * Base64 string `data` keeps `JSON.parse` heap bounded vs `{ type: 'Buffer', data: [n,…] }`.
 */
export function createTransferAssetStreamChunk(
  assetID: string,
  chunk: Buffer | Uint8Array
): { action: 'stream'; assetID: string; encoding: 'base64'; data: string } {
  if (chunk == null) {
    throw new TypeError(
      'Asset stream yielded a null/undefined chunk; refusing to encode (would trigger Buffer.from(undefined))'
    );
  }
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  return {
    action: 'stream',
    assetID,
    encoding: 'base64',
    data: buffer.toString('base64'),
  };
}

/**
 * Decode a stream item from `TransferAssetFlow` after `JSON.parse` (shared by push + pull handlers
 * and the remote source provider).
 */
export function decodeTransferAssetStreamItem(item: {
  action: 'stream';
  data: unknown;
  encoding?: 'base64';
}): Buffer {
  return decodeTransferAssetStreamData(
    item.data,
    item.encoding === 'base64' ? 'base64' : undefined
  );
}

const getLegacyBufferJsonData = (value: unknown): Uint8Array | readonly number[] | null => {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    return null;
  }
  if ((value as { type: unknown }).type !== 'Buffer') {
    return null;
  }
  const raw = (value as { data?: unknown }).data;
  if (Array.isArray(raw) || ArrayBuffer.isView(raw)) {
    return raw as Uint8Array | readonly number[];
  }
  return null;
};

/**
 * Decode binary payload for `TransferAssetFlow` `action: 'stream'` after JSON.parse.
 *
 * Supported shapes (receivers should accept all of these):
 * - **String `data`:** preferred wire form (`createTransferAssetStreamChunk` / `encoding: 'base64'`).
 * - **`{ type: 'Buffer', data: number[] | TypedArray }`:** legacy `Buffer.toJSON()` from default
 *   `JSON.stringify` (older clients/servers).
 * - **`Buffer` instance:** in-process only.
 *
 * Note: Node’s `JSON.stringify` runs `Buffer.toJSON()` before any replacer, so nested `Buffer`
 * values become the legacy object unless you pass a string (use `createTransferAssetStreamChunk`).
 */
export function decodeTransferAssetStreamData(data: unknown, encoding?: 'base64'): Buffer {
  if (encoding === 'base64' && typeof data === 'string') {
    return Buffer.from(data, 'base64');
  }
  // `encoding: 'base64'` with a non-string payload (or no encoding) uses the same fallbacks as
  // legacy peers — avoids throwing when flags and payload disagree.

  if (Buffer.isBuffer(data)) {
    return Buffer.from(data);
  }

  const legacyBufferData = getLegacyBufferJsonData(data);
  if (legacyBufferData) {
    return Buffer.from(legacyBufferData);
  }

  // Wire base64 string (pull generator and any other path that stringifies a string payload).
  if (typeof data === 'string') {
    return Buffer.from(data, 'base64');
  }

  throw new TypeError('Invalid transfer asset stream chunk payload');
}

/** Approximate decoded byte size for batching (pull asset generator). */
export function transferAssetStreamChunkByteLength(chunk: {
  action: string;
  data?: unknown;
  encoding?: 'base64';
}): number {
  if (chunk.action !== 'stream') {
    return 0;
  }
  if (typeof chunk.data === 'string') {
    return Math.floor((chunk.data.length * 3) / 4);
  }
  if (Buffer.isBuffer(chunk.data)) {
    return chunk.data.byteLength;
  }

  const legacyBufferData = getLegacyBufferJsonData(chunk.data);
  if (legacyBufferData) {
    if (Array.isArray(legacyBufferData)) {
      return legacyBufferData.length;
    }
    if (ArrayBuffer.isView(legacyBufferData)) {
      return legacyBufferData.byteLength;
    }
  }
  return 0;
}
