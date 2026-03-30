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

describe('Remote source maxBatchSize (pull init)', () => {
  let ws: MockWebSocket;
  let dispatcher: {
    dispatchCommand: jest.Mock;
    dispatchTransferAction: jest.Mock;
    dispatchTransferStep: jest.Mock;
    setTransferProperties: jest.Mock;
    dispatch: jest.Mock;
    transferID: string;
    transferKind: 'pull';
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
      transferKind: 'pull',
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);
  });

  test('init always sends transfer: pull', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      assetBatchMaxBytes: 1024 * 1024,
      jsonBatchMaxBytes: 1024 * 1024,
    });

    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
    });

    await provider.bootstrap();

    expect(dispatcher.dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'init',
        params: expect.objectContaining({
          transfer: 'pull',
        }),
      })
    );
  });

  test('init dispatchCommand includes maxBatchSize when option is set', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      assetBatchMaxBytes: 512 * 1024,
      jsonBatchMaxBytes: 512 * 1024,
    });

    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      maxBatchSize: 96,
    });

    await provider.bootstrap();

    expect(dispatcher.dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'init',
        params: expect.objectContaining({
          transfer: 'pull',
          maxBatchSize: 96,
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

    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      verifyChecksums: true,
    });

    await provider.bootstrap();

    const initCall = dispatcher.dispatchCommand.mock.calls.find((c) => c[0]?.command === 'init');
    expect(initCall?.[0]?.params).toBeDefined();
    expect(initCall?.[0]?.params).not.toHaveProperty('maxBatchSize');
  });

  test('init combines maxBatchSize with checksums when both are set', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      checksums: true,
      assetBatchMaxBytes: 1024 * 1024,
      jsonBatchMaxBytes: 1024 * 1024,
    });

    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      verifyChecksums: true,
      maxBatchSize: 72,
    });

    await provider.bootstrap();

    expect(dispatcher.dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          transfer: 'pull',
          checksums: true,
          maxBatchSize: 72,
        }),
      })
    );
  });

  test('bootstrap succeeds when peer omits batch size fields (legacy server)', async () => {
    dispatcher.dispatchCommand.mockResolvedValueOnce({
      transferID: 't1',
      checksums: true,
    });

    const diagnostics = { report: jest.fn() };
    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
    });

    await expect(provider.bootstrap(diagnostics as any)).resolves.toBeUndefined();
  });
});
