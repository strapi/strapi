import { WebSocket } from 'ws';
import { dispatch } from '../utils';

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
    const ws = new WebSocket('ws://test/admin/transfer');
    const message = {
      test: 'hello',
    };

    dispatch(ws, message);

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
