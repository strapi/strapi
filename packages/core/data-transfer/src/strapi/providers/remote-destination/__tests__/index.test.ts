import { WebSocket } from 'ws';
import type { IRemoteStrapiDestinationProviderOptions } from '..';

import { createRemoteStrapiDestinationProvider } from '..';
import { TRANSFER_PATH } from '../../../remote/constants';

const defaultOptions: IRemoteStrapiDestinationProviderOptions = {
  strategy: 'restore',
  url: new URL('http://strapi.com/admin'),
  auth: undefined,
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

  test('Should use ws protocol for http urls', async () => {
    const provider = createRemoteStrapiDestinationProvider(defaultOptions);
    try {
      await provider.bootstrap();
    } catch {
      // ignore ws connection error
    }

    expect(WebSocket).toHaveBeenCalledWith(`ws://strapi.com/admin${TRANSFER_PATH}`);
  });

  test('Should use wss protocol for https urls', async () => {
    const provider = createRemoteStrapiDestinationProvider({
      ...defaultOptions,
      url: new URL('https://strapi.com/admin'),
    });
    try {
      await provider.bootstrap();
    } catch {
      // ignore ws connection error
    }

    expect(WebSocket).toHaveBeenCalledWith(`wss://strapi.com/admin${TRANSFER_PATH}`);
  });

  test('Should throw on invalid protocol', async () => {
    const provider = createRemoteStrapiDestinationProvider({
      ...defaultOptions,
      url: new URL('ws://strapi.com/admin'),
    });

    await expect(provider.bootstrap()).rejects.toThrowError('Invalid protocol');
  });
});
