import { EventEmitter } from 'events';
import type { Core } from '@strapi/types';

import { createRemoteStrapiSourceProvider } from '..';
import { connectToWebsocket, createDispatcher } from '../../utils';

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  connectToWebsocket: jest.fn(),
  createDispatcher: jest.fn(),
}));

class MockWebSocket extends EventEmitter {
  send = jest.fn((_payload: string, cb?: (err?: Error) => void) => cb?.());

  close = jest.fn();
}

describe('Remote source reconnect dispatcher wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createDispatcher receives a socket getter and reconnect options; isEnabled is true after negotiated resume', async () => {
    const ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);

    const dispatcher = {
      dispatchCommand: jest
        .fn()
        .mockResolvedValue({ transferID: 't1', resume: true, sessionId: 's-1', checkpoint: {} }),
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn(),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'pull' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      resumeOnReconnect: true,
    });

    await provider.bootstrap({ report: jest.fn() } as any);

    expect(createDispatcher).toHaveBeenCalledTimes(1);
    const [socketGetter, , , reconnectOpts] = (createDispatcher as jest.Mock).mock.calls[0];

    expect(typeof socketGetter).toBe('function');
    expect(socketGetter()).toBe(ws);

    expect(reconnectOpts).toEqual(
      expect.objectContaining({
        reconnect: expect.any(Function),
        isEnabled: expect.any(Function),
      })
    );
    expect((reconnectOpts as { isEnabled: () => boolean }).isEnabled()).toBe(true);
  });

  test('reconnect callback opens a new websocket and re-runs init (with resumeSessionId) then bootstrap', async () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValueOnce(ws1).mockResolvedValueOnce(ws2);

    const dispatcher = {
      dispatchCommand: jest
        .fn()
        .mockResolvedValueOnce({
          transferID: 't1',
          resume: true,
          sessionId: 's-1',
          checkpoint: {},
        })
        .mockResolvedValueOnce({
          transferID: 't2',
          resume: true,
          sessionId: 's-1',
          checkpoint: {},
        }),
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn(),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'pull' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      resumeOnReconnect: true,
    });

    await provider.bootstrap({ report: jest.fn() } as any);

    const reconnectOpts = (createDispatcher as jest.Mock).mock.calls[0][3] as {
      reconnect: () => Promise<void>;
    };

    await reconnectOpts.reconnect();

    expect(connectToWebsocket).toHaveBeenCalledTimes(2);

    expect(dispatcher.dispatchCommand).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        command: 'init',
        params: expect.objectContaining({
          transfer: 'pull',
          resume: true,
          resumeSessionId: 's-1',
        }),
      })
    );

    expect(dispatcher.setTransferProperties).toHaveBeenLastCalledWith({ id: 't2', kind: 'pull' });
    expect(dispatcher.dispatchTransferAction).toHaveBeenCalledWith('bootstrap');
    expect(dispatcher.dispatchTransferAction).toHaveBeenCalledTimes(2);
  });

  test('isEnabled from createDispatcher is false when server does not negotiate resume', async () => {
    const ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);

    const dispatcher = {
      dispatchCommand: jest.fn().mockResolvedValue({
        transferID: 't1',
        resume: false,
        sessionId: undefined,
      }),
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn(),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'pull' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      resumeOnReconnect: true,
    });

    await provider.bootstrap({ report: jest.fn() } as any);

    const reconnectOpts = (createDispatcher as jest.Mock).mock.calls[0][3] as {
      isEnabled: () => boolean;
    };

    expect(reconnectOpts.isEnabled()).toBe(false);
  });
});
