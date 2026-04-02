import {
  replacerForTransferWebSocket,
  stringifyTransferWebSocketPayload,
} from '../transfer-websocket-json';

describe('stringifyTransferWebSocketPayload', () => {
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
});
