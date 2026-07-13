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

/**
 * Pre-#23479 remotes do `Buffer.from(item.data.data)` directly in push.ts and crash on the new
 * `{ encoding: 'base64', data: '<string>' }` shape (item.data.data is undefined). The client must
 * detect non-echoing remotes during init and switch to the legacy `{ type: 'Buffer', data: [] }`
 * shape so pushes against those remotes still work.
 */
describe('Remote destination asset-encoding negotiation', () => {
  const runAssetTransfer = async (initResponse: {
    transferID: string;
    assetEncoding?: 'base64';
  }) => {
    const ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);

    const initParams: unknown[] = [];
    const streamBatches: unknown[][] = [];
    const dispatcher = {
      dispatchCommand: jest.fn(async (msg: { command: string; params?: unknown }) => {
        if (msg.command === 'init') {
          initParams.push(msg.params);
          return initResponse;
        }
        return null;
      }),
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
      transferID: initResponse.transferID,
      transferKind: 'push' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const diagnostics = { report: jest.fn() };
    const provider = createRemoteStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      url: new URL('http://localhost:1337/admin'),
    });

    await provider.bootstrap(diagnostics as any);

    const writable = provider.createAssetsWriteStream();
    if (writable instanceof Promise) {
      throw new Error('Expected synchronous Writable');
    }

    const asset: IAsset = {
      filename: 'f.bin',
      filepath: '/tmp/f.bin',
      stats: { size: 3 } as IAsset['stats'],
      metadata: { id: 1 },
      stream: Readable.from([Buffer.from([1, 2, 3])]),
    };

    await new Promise<void>((resolve, reject) => {
      writable.write(asset, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      writable.end((err) => (err ? reject(err) : resolve()));
    });

    return { initParams, streamBatches, diagnostics };
  };

  test('requests base64 encoding in init params', async () => {
    const { initParams } = await runAssetTransfer({ transferID: 't', assetEncoding: 'base64' });
    expect(initParams[0]).toMatchObject({ assetEncoding: 'base64' });
  });

  test('keeps base64 chunk shape when the remote echoes assetEncoding back', async () => {
    const { streamBatches, diagnostics } = await runAssetTransfer({
      transferID: 't',
      assetEncoding: 'base64',
    });

    const streamItem = streamBatches
      .flat()
      .find((i) => (i as { action: string }).action === 'stream') as
      | { encoding?: string; data?: unknown }
      | undefined;
    expect(streamItem?.encoding).toBe('base64');
    expect(typeof streamItem?.data).toBe('string');

    // No downgrade warning.
    const warnings = (diagnostics.report as jest.Mock).mock.calls
      .map(([d]) => d)
      .filter((d: { kind: string }) => d.kind === 'warning');
    expect(
      warnings.find((w: { details: { message: string } }) =>
        w.details.message.includes('compact base64 asset-chunk format')
      )
    ).toBeUndefined();
  });

  test('falls back to legacy Buffer JSON shape and warns when the remote drops assetEncoding', async () => {
    const { streamBatches, diagnostics } = await runAssetTransfer({ transferID: 't' });

    const streamItem = streamBatches
      .flat()
      .find((i) => (i as { action: string }).action === 'stream') as
      | { encoding?: string; data?: { type?: string; data?: number[] } }
      | undefined;

    expect(streamItem?.encoding).toBeUndefined();
    expect(streamItem?.data).toEqual({ type: 'Buffer', data: [1, 2, 3] });

    expect(diagnostics.report).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'warning',
        details: expect.objectContaining({
          message: expect.stringContaining('compact base64 asset-chunk format'),
        }),
      })
    );
  });
});
