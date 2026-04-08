import { EventEmitter } from 'events';

import { createRemoteStrapiDestinationProvider } from '..';
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

describe('Remote destination maxBatchSize negotiation', () => {
  let ws: MockWebSocket;
  let dispatcher: {
    dispatchCommand: jest.Mock;
    dispatchTransferAction: jest.Mock;
    dispatchTransferStep: jest.Mock;
    setTransferProperties: jest.Mock;
    dispatch: jest.Mock;
    transferID: string;
    transferKind: 'push';
  };

  beforeEach(() => {
    ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);
    dispatcher = {
      dispatchCommand: jest.fn(),
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn(),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'push',
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);
  });

  test('init dispatchCommand includes maxBatchSize when option is set', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      checksums: true,
      assetBatchMaxBytes: 512 * 1024,
      jsonBatchMaxBytes: 400 * 1024,
    });

    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
      maxBatchSize: 64,
    });

    await provider.bootstrap();

    expect(dispatcher.dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'init',
        params: expect.objectContaining({
          transfer: 'push',
          maxBatchSize: 64,
        }),
      })
    );
  });

  test('init params omit maxBatchSize when option is not set (non-breaking)', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      checksums: true,
      assetBatchMaxBytes: 1024 * 1024,
      jsonBatchMaxBytes: 1024 * 1024,
    });

    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
    });

    await provider.bootstrap();

    const initCall = dispatcher.dispatchCommand.mock.calls.find((c) => c[0]?.command === 'init');
    expect(initCall?.[0]?.params).toBeDefined();
    expect(initCall?.[0]?.params).not.toHaveProperty('maxBatchSize');
  });

  test('bootstrap succeeds when peer omits batch size fields (legacy server)', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      checksums: true,
    });

    const diagnostics = { report: jest.fn() };
    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
    });

    await expect(provider.bootstrap(diagnostics as any)).resolves.toBeUndefined();
  });

  test('bootstrap succeeds when peer returns explicit assetBatchMaxBytes and jsonBatchMaxBytes', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      checksums: true,
      maxBatchSize: 32,
      assetBatchMaxBytes: 65536,
      jsonBatchMaxBytes: 131072,
    });

    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
      maxBatchSize: 128,
    });

    await expect(provider.bootstrap()).resolves.toBeUndefined();
  });

  test('init still sends strategy and restore with maxBatchSize', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      assetBatchMaxBytes: 1024 * 1024,
      jsonBatchMaxBytes: 1024 * 1024,
    });

    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: { entities: ['api::article.article'] },
      url: new URL('http://localhost:1337/admin'),
      maxBatchSize: 48,
    });

    await provider.bootstrap();

    expect(dispatcher.dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          options: { strategy: 'restore', restore: { entities: ['api::article.article'] } },
          transfer: 'push',
          maxBatchSize: 48,
        }),
      })
    );
  });
});
