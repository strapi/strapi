import { EventEmitter } from 'events';
import { Readable } from 'stream';

import type { IAsset } from '../../../../../types';
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

describe('Remote destination checksum negotiation', () => {
  test('warns and continues without checksums when peer does not support checksum negotiation', async () => {
    const ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);

    const streamBatches: unknown[][] = [];
    const dispatcher = {
      dispatchCommand: jest.fn().mockResolvedValue({ transferID: 't1' }), // no `checksums` support
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn(
        async (msg: { action: string; data?: unknown; step?: string }) => {
          if (msg.action === 'stream' && msg.step === 'assets' && Array.isArray(msg.data)) {
            streamBatches.push(msg.data);
          }
          if (msg.action === 'start') {
            return { ok: true };
          }
          if (msg.action === 'end') {
            return { ok: true, stats: { started: 1, finished: 1 } };
          }
          return null;
        }
      ),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'push' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const diagnostics = { report: jest.fn() };
    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
      verifyChecksums: true,
    });

    await provider.bootstrap(diagnostics as any);

    expect(diagnostics.report).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'warning',
        details: expect.objectContaining({
          message: expect.stringContaining('does not support checksum negotiation'),
        }),
      })
    );

    const writable = provider.createAssetsWriteStream();
    if (writable instanceof Promise) {
      throw new Error('Expected synchronous Writable');
    }

    const asset: IAsset = {
      filename: 'f.bin',
      filepath: '/tmp/f.bin',
      stats: { size: 3 } as IAsset['stats'],
      metadata: { id: 1 } as IAsset['metadata'],
      stream: Readable.from([Buffer.from([1, 2, 3])]),
    };

    await new Promise<void>((resolve, reject) => {
      writable.write(asset, (err?: Error | null) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      writable.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    const endItem = streamBatches.flat().find((i) => (i as { action: string }).action === 'end') as
      | { checksum?: unknown }
      | undefined;

    expect(endItem?.checksum).toBeUndefined();
  });

  test('warns when reconnect-resume is requested but peer does not support it', async () => {
    const ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);

    const dispatcher = {
      dispatchCommand: jest.fn().mockResolvedValue({ transferID: 't1', checksums: true }), // no `resume`
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn().mockResolvedValue(null),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'push' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const diagnostics = { report: jest.fn() };
    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
      resumeOnReconnect: true,
    });

    await provider.bootstrap(diagnostics as any);

    expect(diagnostics.report).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'warning',
        details: expect.objectContaining({
          message: expect.stringContaining('does not support reconnect negotiation'),
        }),
      })
    );
  });

  test('reuses resume session id on subsequent init when peer supports reconnect', async () => {
    const ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);

    const dispatcher = {
      dispatchCommand: jest
        .fn()
        .mockResolvedValueOnce({
          transferID: 't1',
          checksums: true,
          resume: true,
          sessionId: 's-1',
        })
        .mockResolvedValueOnce({
          transferID: 't2',
          checksums: true,
          resume: true,
          sessionId: 's-1',
        }),
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn().mockResolvedValue(null),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'push' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
      resumeOnReconnect: true,
    });

    await provider.bootstrap({ report: jest.fn() } as any);
    await (provider as any).initTransfer();

    expect(dispatcher.dispatchCommand).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        params: expect.objectContaining({
          transfer: 'push',
          resume: true,
          resumeSessionId: 's-1',
        }),
      })
    );
  });
});
