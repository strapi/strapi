/**
 * Shared `JSON.stringify` replacer for data-transfer WebSocket frames (push and pull).
 *
 * Default `JSON.stringify` uses `Buffer.toJSON()` → `{ type: 'Buffer', data: [n,n,...] }`, which
 * allocates a large array on the peer during `JSON.parse`. Encode binary values as compact base64 strings instead.
 *
 * Note: Node runs `Buffer.prototype.toJSON` before the replacer sees a `Buffer` property, so the
 * replacer receives `{ type: 'Buffer', data: [...] }` unless the value is already a string (see
 * `createTransferAssetStreamChunk` in `transfer-asset-chunk.ts`).
 */
export const replacerForTransferWebSocket = (_key: string, value: unknown): unknown => {
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64');
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const v = value as NodeJS.TypedArray;
    return Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64');
  }
  return value;
};
