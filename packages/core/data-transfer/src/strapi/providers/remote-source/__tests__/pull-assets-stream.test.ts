import { EventEmitter } from 'node:events';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import type { Core } from '@strapi/types';
import type { WebSocket } from 'ws';

import type { IAsset } from '../../../../../types';

import { createRemoteStrapiSourceProvider } from '..';
import { ProviderTransferError } from '../../../../errors/providers';

/** WebSocket frame shape expected by RemoteStrapiSourceProvider.#createStageReadStream */
function transferMessageBuffer(opts: {
  uuid: string;
  processId: string;
  ended?: boolean;
  error?: unknown;
  data?: unknown;
}) {
  return Buffer.from(
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
}

function oneAssetBatch(
  assetID: string,
  checksum?: {
    algorithm: 'sha256';
    value: string;
  }
) {
  const chunk = Buffer.from([0x01, 0x02, 0x03]);
  return [
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
      data: { type: 'Buffer' as const, data: Array.from(chunk) },
    },
    { action: 'end' as const, assetID, ...(checksum ? { checksum } : {}) },
  ];
}

/**
 * Minimal WebSocket mock: provider only needs `once('message')` and `send` for ACKs.
 */
class MockTransferWebSocket extends EventEmitter {
  send = jest.fn((_payload: string, cb?: (err?: Error) => void) => {
    cb?.();
  });
}

const createProviderWithMockDispatcher = (
  ws: MockTransferWebSocket,
  processId: string,
  options: { verifyChecksums?: boolean } = {}
) => {
  const provider = createRemoteStrapiSourceProvider({
    url: new URL('http://localhost:1337/admin'),
    getStrapi: () => ({}) as Core.Strapi,
    streamTimeout: 60_000,
    ...(options.verifyChecksums !== undefined ? { verifyChecksums: options.verifyChecksums } : {}),
  });

  provider.ws = ws as unknown as WebSocket;
  provider.dispatcher = {
    dispatchTransferStep: jest.fn(async (msg: { action: string }) => {
      if (msg.action === 'start') {
        return { id: processId };
      }
      return null;
    }),
    setTransferProperties: jest.fn(),
    dispatchCommand: jest.fn(),
    dispatch: jest.fn(),
    dispatchTransferAction: jest.fn(),
    transferID: 't1',
    transferKind: 'pull',
  } as unknown as typeof provider.dispatcher;

  return provider;
};

describe('Remote Strapi source provider — pull assets stream', () => {
  const processId = 'flush-process-id';

  const flushPromises = () =>
    new Promise<void>((resolve) => {
      setImmediate(() => {
        resolve();
      });
    });

  test('after each asset completes the same assetID can start again (registry must not retain closed assets)', async () => {
    const ws = new MockTransferWebSocket();
    const dispatchTransferStep = jest.fn(async (msg: { action: string; step?: string }) => {
      if (msg.action === 'start') {
        return { id: processId };
      }
      return null;
    });
    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      streamTimeout: 60_000,
    });

    provider.ws = ws as unknown as WebSocket;
    provider.dispatcher = {
      dispatchTransferStep,
      setTransferProperties: jest.fn(),
      dispatchCommand: jest.fn(),
      dispatch: jest.fn(),
      dispatchTransferAction: jest.fn(),
      transferID: 't1',
      transferKind: 'pull',
    } as unknown as typeof provider.dispatcher;

    const pass = await provider.createAssetsReadStream();

    const reuseId = 'reused-asset-id';
    const cycles = 40;

    const drainPass = pipeline(
      pass,
      new Writable({
        objectMode: true,
        highWaterMark: 1,
        write(asset: IAsset, _enc, cb) {
          const rs = asset.stream;
          if (!rs) {
            cb();
            return;
          }
          pipeline(
            rs,
            new Writable({
              write(_chunk, _e, c) {
                c();
              },
            })
          ).then(
            () => {
              cb();
            },
            (err) => {
              cb(err);
            }
          );
        },
      })
    );

    for (let i = 0; i < cycles; i += 1) {
      ws.emit(
        'message',
        transferMessageBuffer({
          uuid: `u-${i}`,
          processId,
          data: [oneAssetBatch(reuseId)],
        })
      );
      await flushPromises();
    }

    ws.emit(
      'message',
      transferMessageBuffer({
        uuid: 'u-end',
        processId,
        ended: true,
      })
    );

    await drainPass;

    // Client start + end for the assets step, and one WebSocket ACK per incoming message (cycles + end).
    expect(dispatchTransferStep).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'start', step: 'assets' })
    );
    expect(dispatchTransferStep).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'end', step: 'assets' })
    );
    expect(dispatchTransferStep).toHaveBeenCalledTimes(2);
    expect(ws.send).toHaveBeenCalledTimes(cycles + 1);
  }, 15_000);

  test('many small asset batches complete without error (registry does not grow with batch count)', async () => {
    const ws = new MockTransferWebSocket();
    const dispatchTransferStep = jest.fn(async (msg: { action: string }) => {
      if (msg.action === 'start') {
        return { id: processId };
      }
      return null;
    });
    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      streamTimeout: 60_000,
    });

    provider.ws = ws as unknown as WebSocket;
    provider.dispatcher = {
      dispatchTransferStep,
      setTransferProperties: jest.fn(),
      dispatchCommand: jest.fn(),
      dispatch: jest.fn(),
      dispatchTransferAction: jest.fn(),
      transferID: 't1',
      transferKind: 'pull',
    } as unknown as typeof provider.dispatcher;

    const pass = await provider.createAssetsReadStream();

    const batchCount = 25;

    const drainPass = pipeline(
      pass,
      new Writable({
        objectMode: true,
        highWaterMark: 1,
        write(asset: IAsset, _enc, cb) {
          const rs = asset.stream;
          if (!rs) {
            cb();
            return;
          }
          pipeline(
            rs,
            new Writable({
              write(_chunk, _e, c) {
                c();
              },
            })
          ).then(
            () => {
              cb();
            },
            (err) => {
              cb(err);
            }
          );
        },
      })
    );

    for (let i = 0; i < batchCount; i += 1) {
      const id = `unique-${i}`;
      ws.emit(
        'message',
        transferMessageBuffer({
          uuid: `batch-${i}`,
          processId,
          data: [oneAssetBatch(id)],
        })
      );
      await flushPromises();
    }

    ws.emit(
      'message',
      transferMessageBuffer({
        uuid: 'u-end',
        processId,
        ended: true,
      })
    );

    await drainPass;

    expect(dispatchTransferStep).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'start', step: 'assets' })
    );
    expect(dispatchTransferStep).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'end', step: 'assets' })
    );
    expect(dispatchTransferStep).toHaveBeenCalledTimes(2);
    expect(ws.send).toHaveBeenCalledTimes(batchCount + 1);
  }, 20_000);

  test('throws on checksum mismatch when verifyChecksums is enabled', async () => {
    const ws = new MockTransferWebSocket();
    const provider = createProviderWithMockDispatcher(ws, processId, { verifyChecksums: true });

    const pass = await provider.createAssetsReadStream();
    const id = 'asset-with-bad-checksum';
    const badChecksum = createHash('sha256').update(Buffer.from('wrong')).digest('hex');

    const settled = pipeline(
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
    ).catch((e: unknown) => e);

    ws.emit(
      'message',
      transferMessageBuffer({
        uuid: 'checksum-1',
        processId,
        data: [
          oneAssetBatch(id, {
            algorithm: 'sha256',
            value: badChecksum,
          }),
        ],
      })
    );
    await flushPromises();

    ws.emit(
      'message',
      transferMessageBuffer({
        uuid: 'checksum-end',
        processId,
        ended: true,
      })
    );

    const checksumErr = await settled;
    expect(checksumErr).toBeInstanceOf(ProviderTransferError);
    expect((checksumErr as Error).message).toMatch(/Checksum mismatch/);
  });

  test('throws ProviderTransferError when checksum is required but missing', async () => {
    const ws = new MockTransferWebSocket();
    const provider = createProviderWithMockDispatcher(ws, processId, { verifyChecksums: true });

    const pass = await provider.createAssetsReadStream();
    const id = 'asset-missing-checksum';

    const settled = pipeline(
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
    ).catch((e: unknown) => e);

    ws.emit(
      'message',
      transferMessageBuffer({
        uuid: 'missing-1',
        processId,
        data: [oneAssetBatch(id)],
      })
    );
    await flushPromises();

    ws.emit(
      'message',
      transferMessageBuffer({
        uuid: 'missing-end',
        processId,
        ended: true,
      })
    );

    const missingErr = await settled;
    expect(missingErr).toBeInstanceOf(ProviderTransferError);
    expect((missingErr as Error).message).toMatch(/missing checksum/i);
  });

  test('accepts matching checksum when verifyChecksums is enabled', async () => {
    const ws = new MockTransferWebSocket();
    const provider = createProviderWithMockDispatcher(ws, processId, { verifyChecksums: true });
    const pass = await provider.createAssetsReadStream();

    const id = 'asset-with-good-checksum';
    const goodChecksum = createHash('sha256')
      .update(Buffer.from([0x01, 0x02, 0x03]))
      .digest('hex');

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
        uuid: 'good-1',
        processId,
        data: [
          oneAssetBatch(id, {
            algorithm: 'sha256',
            value: goodChecksum,
          }),
        ],
      })
    );
    await flushPromises();
    ws.emit('message', transferMessageBuffer({ uuid: 'good-end', processId, ended: true }));

    await expect(drainPass).resolves.toBeUndefined();
  });

  test('ignores missing checksum when verifyChecksums is disabled', async () => {
    const ws = new MockTransferWebSocket();
    const provider = createProviderWithMockDispatcher(ws, processId, { verifyChecksums: false });
    const pass = await provider.createAssetsReadStream();

    const id = 'asset-without-checksum-disabled';
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
        uuid: 'disabled-1',
        processId,
        data: [oneAssetBatch(id)],
      })
    );
    await flushPromises();
    ws.emit('message', transferMessageBuffer({ uuid: 'disabled-end', processId, ended: true }));

    await expect(drainPass).resolves.toBeUndefined();
  });
});
