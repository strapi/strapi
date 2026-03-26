import { WebSocket } from 'ws';
import { TRANSFER_PATH } from '../../../remote/constants';
import { CommandMessage } from '../../../../../types/remote/protocol/client';
import { createDispatcher } from '../../utils';

jest.useFakeTimers();
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => {
    return {
      ...jest.requireActual('ws').WebSocket,
      send: jest.fn(),
      once: jest.fn(),
    };
  }),
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe('Remote Strapi Destination Utils', () => {
  test('Dispatch method sends payload', () => {
    const ws = new WebSocket(`ws://test/admin${TRANSFER_PATH}`);
    const message: CommandMessage = {
      type: 'command',
      command: 'status',
    };

    createDispatcher(ws).dispatch(message);

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

  test('dispatch stringifies typed arrays with websocket replacer', () => {
    const ws = new WebSocket(`ws://test/admin${TRANSFER_PATH}`);
    const message = {
      type: 'transfer' as const,
      kind: 'step' as const,
      step: 'entities' as const,
      action: 'stream' as const,
      data: [{ bytes: new Uint8Array([0xde, 0xad]) }],
    };

    createDispatcher(ws).dispatch(message);

    // @ts-ignore
    const payload = (ws.send as jest.Mock).mock.calls[0]?.[0];
    const parsed = JSON.parse(payload) as {
      data: Array<{ bytes: string }>;
    };

    expect(parsed.data[0].bytes).toBe(Buffer.from([0xde, 0xad]).toString('base64'));
  });
});
