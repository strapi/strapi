import { WebSocket } from 'ws';
import type { IRemoteStrapiDestinationProviderOptions } from '..';

import { createRemoteStrapiDestinationProvider } from '..';

const defaultOptions: IRemoteStrapiDestinationProviderOptions = {
  strategy: 'restore',
  url: '<some_url>',
};

jest.mock('../utils', () => ({
  createDispatcher: jest.fn(),
}));

jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => {
    return {
      ...jest.requireActual('ws').WebSocket,
      send: jest.fn(),
      once: jest.fn((type, callback) => {
        callback();
        return {
          once: jest.fn((t, c) => c),
        };
      }),
    };
  }),
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe('Remote Strapi Destination', () => {
  describe('Bootstrap', () => {
    test('Should not have a defined websocket connection if bootstrap has not been called', () => {
      const provider = createRemoteStrapiDestinationProvider(defaultOptions);

      expect(provider.ws).toBeNull();
    });

    test('Should have a defined websocket connection if bootstrap has been called', async () => {
      const provider = createRemoteStrapiDestinationProvider(defaultOptions);
      try {
        await provider.bootstrap();
      } catch {
        // ignore ws connection error
      }

      expect(provider.ws).not.toBeNull();
      expect(provider.ws?.readyState).toBe(WebSocket.CLOSED);
    });
  });
});
