import {
  replacerForTransferWebSocket,
  stringifyTransferWebSocketPayload,
} from '../transfer-websocket-json';

describe('stringifyTransferWebSocketPayload', () => {
  test('raw JSON.stringify throws on BigInt; wire helper encodes nested bigint metadata as decimal strings', () => {
    expect(() => JSON.stringify({ size: 9007199254740993n })).toThrow();

    const s = stringifyTransferWebSocketPayload({
      uuid: 'u',
      type: 'transfer',
      kind: 'step',
      action: 'stream',
      step: 'assets',
      data: [
        {
          action: 'start',
          assetID: '1',
          metadata: { size: 9007199254740993n, name: 'blob.bin' },
        },
      ],
    } as Record<string, unknown>);

    expect(s).toContain('"size":"9007199254740993"');
    expect(s).toContain('"name":"blob.bin"');
  });

  test('circular nested data throws TypeError with context (peer cannot decode cycles)', () => {
    const cyclic: Record<string, unknown> = { tag: 'x' };
    cyclic.self = cyclic;

    expect(() =>
      stringifyTransferWebSocketPayload({
        uuid: 'u',
        type: 'transfer',
        data: cyclic,
      } as Record<string, unknown>)
    ).toThrow(TypeError);

    expect(() =>
      stringifyTransferWebSocketPayload({
        uuid: 'u',
        type: 'transfer',
        data: cyclic,
      } as Record<string, unknown>)
    ).toThrow(/could not be serialized to JSON/);
  });

  test('upload-like nested metadata (unicode, null, empty object, deep keys) serializes', () => {
    const s = stringifyTransferWebSocketPayload({
      uuid: 'u',
      type: 'transfer',
      kind: 'step',
      action: 'stream',
      step: 'assets',
      data: {
        action: 'start',
        assetID: 'file-48',
        metadata: {
          name: 'café 文件 🗂️.bin',
          caption: null,
          alternativeText: '',
          provider_metadata: { foo: { bar: [1, 2, 3] } },
        },
      },
    } as Record<string, unknown>);

    expect(typeof s).toBe('string');
    const roundTrip = JSON.parse(s) as { data: { metadata: { name: string } } };
    expect(roundTrip.data.metadata.name).toContain('café');
  });

  test('enumerable toJSON on the root object makes raw JSON.stringify return undefined (ws.send would throw)', () => {
    const evil = {
      type: 'transfer',
      kind: 'step',
      action: 'stream',
      step: 'assets',
      data: [],
      toJSON() {
        return undefined;
      },
    };
    const payload = { ...evil, uuid: 'test-uuid' };
    expect(JSON.stringify(payload, replacerForTransferWebSocket)).toBeUndefined();
  });

  test('stringifyTransferWebSocketPayload strips enumerable toJSON so serialization succeeds (fixes ws.send(undefined))', () => {
    const evil = {
      type: 'transfer',
      kind: 'step',
      action: 'stream',
      step: 'assets',
      data: [],
      toJSON() {
        return undefined;
      },
    };
    const payload = { ...evil, uuid: 'test-uuid' } as Record<string, unknown>;
    const s = stringifyTransferWebSocketPayload(payload);
    expect(typeof s).toBe('string');
    expect(s).toContain('"uuid":"test-uuid"');
    expect(s).toContain('"type":"transfer"');
  });

  test('replacer encodes Uint8Array values as base64 strings (nested Buffer may use Buffer.toJSON before replacer)', () => {
    const payload = {
      uuid: 'u',
      raw: new Uint8Array([0xde, 0xad]),
    } as Record<string, unknown>;
    const s = stringifyTransferWebSocketPayload(payload);
    expect(s).toContain('3q0=');
  });

  test('nested plain objects do not need root toJSON strip; only root spread could copy enumerable toJSON', () => {
    const inner = {
      id: 48,
      formats: { large: { url: '/u/x' } },
      toJSON() {
        return { id: 48, note: 'orm-shaped' };
      },
    };
    const s = stringifyTransferWebSocketPayload({
      uuid: 'u',
      type: 'transfer',
      data: { file: inner },
    } as Record<string, unknown>);

    expect(typeof s).toBe('string');
    expect(s).toContain('"note":"orm-shaped"');
  });
});
