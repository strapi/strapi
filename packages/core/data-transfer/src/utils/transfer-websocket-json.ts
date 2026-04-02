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
    const { buffer, byteOffset, byteLength } = value;
    if (buffer == null) {
      throw new TypeError(
        'Invalid Uint8Array in transfer payload (missing underlying ArrayBuffer); cannot encode for WebSocket'
      );
    }
    return Buffer.from(buffer, byteOffset, byteLength).toString('base64');
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const v = value as NodeJS.TypedArray;
    const { buffer, byteOffset, byteLength } = v;
    if (buffer == null) {
      throw new TypeError(
        'Invalid typed array in transfer payload (missing underlying ArrayBuffer); cannot encode for WebSocket'
      );
    }
    return Buffer.from(buffer, byteOffset, byteLength).toString('base64');
  }
  return value;
};

/**
 * `JSON.stringify` invokes an own enumerable `toJSON` on the root value before replacers run. If that
 * method returns `undefined`, the whole `JSON.stringify` result is `undefined`, and `ws.send(undefined)`
 * throws ("The first argument must be of type string or an instance of Buffer... Received undefined").
 * Spreading transfer messages (`{ ...message, uuid }`) can copy an enumerable `toJSON` from user / ORM
 * objects onto the wire payload — strip it on the root object we control.
 */
export function stripRootToJSONMethod(payload: Record<string, unknown>): void {
  if (typeof payload.toJSON === 'function') {
    delete payload.toJSON;
  }
}

/**
 * Serialize a transfer WebSocket envelope. Never returns `undefined` (unlike raw `JSON.stringify`).
 */
export function stringifyTransferWebSocketPayload(payload: Record<string, unknown>): string {
  stripRootToJSONMethod(payload);
  const s = JSON.stringify(payload, replacerForTransferWebSocket);
  if (typeof s !== 'string') {
    throw new TypeError(
      'Transfer WebSocket payload could not be serialized to JSON (result was undefined). Check for Symbol or other non-JSON values on the root payload.'
    );
  }
  return s;
}
