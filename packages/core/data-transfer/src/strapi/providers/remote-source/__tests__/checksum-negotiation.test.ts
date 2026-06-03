import { EventEmitter } from 'events';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset } from '../../../../../types';
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

const transferMessageBuffer = (opts: {
  uuid: string;
  processId: string;
  ended?: boolean;
  error?: unknown;
  data?: unknown;
}) =>
  Buffer.from(
    JSON.stringify({
      uuid: opts.uuid,
      data: {
        type: 'transfer',
        id: opts.processId,
        ended: opts.ended ?? false,
        error: opts.error ?? null,
        data: opts.data ?? null,
      },
    })
  );

const oneAssetBatch = (assetID: string) => [
  {
    action: 'start' as const,
    assetID,
    data: {
      filename: 't.bin',
      metadata: { id: 1 },
    },
  },
  {
    action: 'stream' as const,
    assetID,
    data: { type: 'Buffer' as const, data: [1, 2, 3] },
  },
  { action: 'end' as const, assetID },
];

describe('Remote source checksum negotiation', () => {
  test('warns and continues without checksums when peer does not support checksum negotiation', async () => {
    const ws = new MockWebSocket();
    (connectToWebsocket as jest.Mock).mockResolvedValue(ws);

    const dispatcher = {
      dispatchCommand: jest.fn().mockResolvedValue({ transferID: 't1' }), // no `checksums` support
      dispatchTransferAction: jest.fn().mockResolvedValue(null),
      dispatchTransferStep: jest.fn(async (msg: { action: string }) => {
        if (msg.action === 'start') {
          return { id: 'pid-1' };
        }
        return null;
      }),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'pull' as const,
    };
    (createDispatcher as jest.Mock).mockReturnValue(dispatcher);

    const diagnostics = { report: jest.fn() };
    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
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

    const pass = await provider.createAssetsReadStream();
    const drainPass = pipeline(
      pass,
      new Writable({
        objectMode: true,
        write(asset: IAsset, _enc, cb) {
          pipeline(
            asset.stream,
            new Writable({
              write(_chunk, _e, c) {
                c();
              },
            })
          ).then(
            () => cb(),
            (err) => cb(err)
          );
        },
      })
    );

    ws.emit(
      'message',
      transferMessageBuffer({
        uuid: 'u-1',
        processId: 'pid-1',
        data: [oneAssetBatch('a1')],
      })
    );
    ws.emit('message', transferMessageBuffer({ uuid: 'u-end', processId: 'pid-1', ended: true }));

    await expect(drainPass).resolves.toBeUndefined();
  });
});
