/**
 * Canonical **outbound** asset chunk for WebSocket JSON (push and pull).
 * Base64 string `data` keeps `JSON.parse` heap bounded vs `{ type: 'Buffer', data: [n,…] }`.
 */
export function createTransferAssetStreamChunk(
  assetID: string,
  chunk: Buffer | Uint8Array
): { action: 'stream'; assetID: string; encoding: 'base64'; data: string } {
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
  if (encoding === 'base64') {
    if (typeof data !== 'string') {
      throw new TypeError('Expected base64 string for transfer asset stream chunk');
    }
    return Buffer.from(data, 'base64');
  }

  if (Buffer.isBuffer(data)) {
    return Buffer.from(data);
  }

  if (
    data &&
    typeof data === 'object' &&
    'type' in data &&
    (data as { type: unknown }).type === 'Buffer'
  ) {
    const raw = data as { data?: unknown };
    if (Array.isArray(raw.data) || ArrayBuffer.isView(raw.data)) {
      return Buffer.from(raw.data as Uint8Array | readonly number[]);
    }
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
  return 0;
}
