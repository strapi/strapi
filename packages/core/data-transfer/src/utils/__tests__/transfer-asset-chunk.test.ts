import {
  createTransferAssetStreamChunk,
  decodeTransferAssetStreamData,
  decodeTransferAssetStreamItem,
  transferAssetStreamChunkByteLength,
} from '../transfer-asset-chunk';
import { replacerForTransferWebSocket } from '../transfer-websocket-json';

describe('transfer-asset-chunk', () => {
  const bytes = Buffer.from([0xde, 0xad, 0xbe, 0xef]);

  test('createTransferAssetStreamChunk + decodeTransferAssetStreamItem round-trip', () => {
    const item = createTransferAssetStreamChunk('asset-1', bytes);
    expect(item).toEqual(
      expect.objectContaining({ action: 'stream', assetID: 'asset-1', encoding: 'base64' })
    );
    expect(decodeTransferAssetStreamItem(item)).toEqual(bytes);
  });

  test('decodeTransferAssetStreamItem: legacy Buffer JSON item', () => {
    const item = {
      action: 'stream' as const,
      assetID: 'a',
      data: { type: 'Buffer' as const, data: Array.from(bytes) },
    };
    expect(decodeTransferAssetStreamItem(item)).toEqual(bytes);
  });

  test('decodeTransferAssetStreamData: explicit encoding base64', () => {
    expect(decodeTransferAssetStreamData(bytes.toString('base64'), 'base64')).toEqual(bytes);
  });

  test('decodeTransferAssetStreamData: legacy Buffer JSON shape (client push / old pull)', () => {
    const legacy = { type: 'Buffer' as const, data: Array.from(bytes) };
    expect(decodeTransferAssetStreamData(legacy)).toEqual(bytes);
  });

  test('decodeTransferAssetStreamData: Buffer instance (in-process)', () => {
    expect(decodeTransferAssetStreamData(Buffer.from(bytes))).toEqual(bytes);
  });

  test('decodeTransferAssetStreamData: base64 string without encoding flag', () => {
    const b64 = bytes.toString('base64');
    expect(decodeTransferAssetStreamData(b64)).toEqual(bytes);
  });

  test('wire compatibility: Buffer property stringifies as legacy JSON (Node toJSON, not replacer)', () => {
    const item = { action: 'stream' as const, assetID: 'a', data: Buffer.from(bytes) };
    const wire = JSON.parse(JSON.stringify(item, replacerForTransferWebSocket)) as {
      data: unknown;
    };
    expect(wire.data).toEqual(expect.objectContaining({ type: 'Buffer' }));
    expect(decodeTransferAssetStreamData(wire.data)).toEqual(bytes);
  });

  test('wire compatibility: Uint8Array → WS replacer → base64 string → decode', () => {
    const item = { action: 'stream' as const, assetID: 'a', data: new Uint8Array(bytes) };
    const wire = JSON.parse(JSON.stringify(item, replacerForTransferWebSocket)) as {
      data: unknown;
    };
    expect(typeof wire.data).toBe('string');
    expect(decodeTransferAssetStreamData(wire.data)).toEqual(bytes);
  });

  test('wire compatibility: stream item legacy JSON shape survives parse unchanged', () => {
    const item = {
      action: 'stream' as const,
      assetID: 'a',
      data: { type: 'Buffer' as const, data: Array.from(bytes) },
    };
    const wire = JSON.parse(JSON.stringify(item)) as { data: unknown };
    expect(decodeTransferAssetStreamData(wire.data)).toEqual(bytes);
  });

  test('wire compatibility: explicit pull shape encoding+string', () => {
    const item = {
      action: 'stream' as const,
      assetID: 'a',
      encoding: 'base64' as const,
      data: bytes.toString('base64'),
    };
    const wire = JSON.parse(JSON.stringify(item)) as typeof item;
    expect(decodeTransferAssetStreamData(wire.data, wire.encoding)).toEqual(bytes);
  });

  test('transferAssetStreamChunkByteLength: base64 string (with or without encoding flag)', () => {
    const b64 = bytes.toString('base64');
    expect(
      transferAssetStreamChunkByteLength({
        action: 'stream',
        encoding: 'base64',
        data: b64,
      })
    ).toBe(Math.floor((b64.length * 3) / 4));

    expect(
      transferAssetStreamChunkByteLength({
        action: 'stream',
        data: b64,
      })
    ).toBe(Math.floor((b64.length * 3) / 4));
  });

  test('transferAssetStreamChunkByteLength: Buffer and non-stream', () => {
    expect(
      transferAssetStreamChunkByteLength({
        action: 'stream',
        data: bytes,
      })
    ).toBe(4);

    expect(transferAssetStreamChunkByteLength({ action: 'end' })).toBe(0);
  });

  test('decodeTransferAssetStreamData: encoding base64 with legacy object falls back (no throw)', () => {
    const legacy = { type: 'Buffer' as const, data: Array.from(bytes) };
    expect(decodeTransferAssetStreamData(legacy, 'base64')).toEqual(bytes);
  });

  test('decodeTransferAssetStreamItem: encoding base64 with legacy payload', () => {
    const item = {
      action: 'stream' as const,
      assetID: 'a',
      encoding: 'base64' as const,
      data: { type: 'Buffer' as const, data: Array.from(bytes) },
    };
    expect(decodeTransferAssetStreamItem(item)).toEqual(bytes);
  });

  test('transferAssetStreamChunkByteLength: legacy Buffer JSON shape', () => {
    const legacy = { type: 'Buffer' as const, data: Array.from(bytes) };
    expect(
      transferAssetStreamChunkByteLength({
        action: 'stream',
        data: legacy,
      })
    ).toBe(bytes.length);
  });
});
