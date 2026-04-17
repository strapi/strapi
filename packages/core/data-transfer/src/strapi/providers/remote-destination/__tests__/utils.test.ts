import { WebSocket } from 'ws';
import { TRANSFER_PATH } from '../../../remote/constants';
import { CommandMessage } from '../../../../../types/remote/protocol/client';
import { createDispatcher } from '../../utils';

jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => {
    let onMessage: ((data: string) => void) | undefined;
    return {
      send: jest.fn((payload: string, cb?: (err?: Error) => void) => {
        cb?.();
        const parsed = JSON.parse(payload) as { uuid: string };
        queueMicrotask(() => {
          onMessage?.(JSON.stringify({ uuid: parsed.uuid, data: null }));
        });
      }),
      once: jest.fn((event: string, handler: (data: string) => void) => {
        if (event === 'message') {
          onMessage = handler;
        }
      }),
    };
  }),
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe('Remote Strapi Destination Utils', () => {
  test('Dispatch method sends payload', async () => {
    const ws = new WebSocket(`ws://test/admin${TRANSFER_PATH}`);
    const message: CommandMessage = {
      type: 'command',
      command: 'status',
    };

    await createDispatcher(ws).dispatch(message);

    expect.extend({
      toContain(receivedString, expected) {
        const jsonReceived = JSON.parse(receivedString);
        const pass = Object.keys(expected).every((key) => jsonReceived[key] === expected[key]);

        return {
          message: () =>
            `Expected ${jsonReceived} ${!pass && 'not'} to contain properties ${expected}`,
          pass,
        };
      },
    });

    // @ts-ignore
    expect(ws.send).toHaveBeenCalledWith(expect.toContain(message), expect.anything());
  });

  test('dispatch stringifies typed arrays with websocket replacer', async () => {
    const ws = new WebSocket(`ws://test/admin${TRANSFER_PATH}`);
    const message = {
      type: 'transfer' as const,
      kind: 'step' as const,
      step: 'entities' as const,
      action: 'stream' as const,
      data: [{ bytes: new Uint8Array([0xde, 0xad]) }],
    };

    await createDispatcher(ws).dispatch(message);

    // @ts-ignore
    const payload = (ws.send as jest.Mock).mock.calls[0]?.[0];
    const parsed = JSON.parse(payload) as {
      data: Array<{ bytes: string }>;
    };

    expect(parsed.data[0].bytes).toBe(Buffer.from([0xde, 0xad]).toString('base64'));
  });
});
