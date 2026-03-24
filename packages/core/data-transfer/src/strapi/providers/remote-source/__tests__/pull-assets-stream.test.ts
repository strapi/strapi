import { EventEmitter } from 'node:events';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import type { Core } from '@strapi/types';
import type { WebSocket } from 'ws';

import type { IAsset } from '../../../../../types';

import { createRemoteStrapiSourceProvider } from '..';

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

function oneAssetBatch(assetID: string) {
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
    { action: 'end' as const, assetID },
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
    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      streamTimeout: 60_000,
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

    expect(provider.dispatcher?.dispatchTransferStep).toHaveBeenCalled();
  }, 15_000);

  test('heap growth stays bounded when many small asset batches are pulled (no per-asset registry leak)', async () => {
    const ws = new MockTransferWebSocket();
    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
      streamTimeout: 60_000,
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

    const pass = await provider.createAssetsReadStream();

    const batchCount = 25;
    const heapBefore = process.memoryUsage().heapUsed;

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

    const heapAfter = process.memoryUsage().heapUsed;
    const growth = heapAfter - heapBefore;
    // Retaining every asset registry entry would scale with batchCount; allow generous slack for V8/Jest.
    expect(growth).toBeLessThan(8 * 1024 * 1024);
  }, 20_000);
});
