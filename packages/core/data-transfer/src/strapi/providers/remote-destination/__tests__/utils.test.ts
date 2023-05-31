import { WebSocket } from 'ws';
import { TRANSFER_PATH } from '../../../remote/constants';
import { CommandMessage } from '../../../../../types/remote/protocol/client';
import { createDispatcher } from '../../utils';

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
});
