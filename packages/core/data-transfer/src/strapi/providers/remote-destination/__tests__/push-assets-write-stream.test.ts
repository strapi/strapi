import { createHash } from 'crypto';
import { Readable } from 'stream';

import type { IAsset } from '../../../../../types';

import { createRemoteStrapiDestinationProvider } from '..';
import type { IRemoteStrapiDestinationProviderOptions } from '..';

const defaultOptions: IRemoteStrapiDestinationProviderOptions = {
  strategy: 'restore',
  url: new URL('http://localhost:1337/admin'),
  auth: undefined,
};

function mockPushDispatcher() {
  const streamBatches: unknown[][] = [];
  return {
    streamBatches,
    dispatcher: {
      dispatchTransferStep: jest.fn(
        async (msg: { action: string; step?: string; data?: unknown }) => {
          if (msg.action === 'stream' && msg.step === 'assets' && Array.isArray(msg.data)) {
            streamBatches.push(msg.data);
          }
          return null;
        }
      ),
      dispatchCommand: jest.fn(),
      dispatchTransferAction: jest.fn(),
      setTransferProperties: jest.fn(),
      dispatch: jest.fn(),
      transferID: 't1',
      transferKind: 'push' as const,
    },
  };
}

const writeOneAsset = async (writable: NodeJS.WritableStream, asset: IAsset): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    writable.write(asset, (err: Error | null | undefined) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    writable.end((err: Error | null | undefined) => (err ? reject(err) : resolve()));
  });
};

describe('Remote Strapi destination provider — push assets write stream', () => {
  test('flushes before asset completes when decoded payload exceeds 1MiB and uses base64 stream chunks', async () => {
    const { streamBatches, dispatcher } = mockPushDispatcher();
    const provider = createRemoteStrapiDestinationProvider(defaultOptions);
    provider.dispatcher = dispatcher as unknown as typeof provider.dispatcher;

    const writable = provider.createAssetsWriteStream();
    if (writable instanceof Promise) {
      throw new Error('Expected synchronous Writable');
    }

    const chunkSize = 200_000;
    const numChunks = 8;
    const stream = Readable.from(
      Array.from({ length: numChunks }, () => Buffer.alloc(chunkSize, 0xab))
    );

    const asset: IAsset = {
      filename: 'big.bin',
      filepath: '/tmp/big.bin',
      stats: { size: chunkSize * numChunks } as IAsset['stats'],
      metadata: { id: 1 },
      stream,
    };

    await new Promise<void>((resolve, reject) => {
      writable.write(asset, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      writable.end((err) => (err ? reject(err) : resolve()));
    });

    expect(streamBatches.length).toBeGreaterThanOrEqual(2);

    const streamItems = streamBatches
      .flat()
      .filter((i) => (i as { action: string }).action === 'stream');
    expect(streamItems).toHaveLength(numChunks);
    for (const item of streamItems) {
      const row = item as { action: string; encoding?: string; data: unknown };
      expect(row.encoding).toBe('base64');
      expect(typeof row.data).toBe('string');
    }
  }, 30_000);

  test('heap growth stays bounded when pushing many small assets (batches are flushed, not retained)', async () => {
    const { streamBatches, dispatcher } = mockPushDispatcher();
    const provider = createRemoteStrapiDestinationProvider(defaultOptions);
    provider.dispatcher = dispatcher as unknown as typeof provider.dispatcher;

    const writable = provider.createAssetsWriteStream();
    if (writable instanceof Promise) {
      throw new Error('Expected synchronous Writable');
    }

    const assetCount = 30;
    const heapBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < assetCount; i += 1) {
      const stream = Readable.from([Buffer.from([i % 256, 0x02, 0x03])]);
      const asset: IAsset = {
        filename: `f-${i}.bin`,
        filepath: `/tmp/f-${i}.bin`,
        stats: { size: 3 } as IAsset['stats'],
        metadata: { id: i },
        stream,
      };
      await new Promise<void>((resolve, reject) => {
        writable.write(asset, (err) => (err ? reject(err) : resolve()));
      });
    }

    await new Promise<void>((resolve, reject) => {
      writable.end((err) => (err ? reject(err) : resolve()));
    });

    const heapAfter = process.memoryUsage().heapUsed;
    expect(heapAfter - heapBefore).toBeLessThan(12 * 1024 * 1024);
    expect(streamBatches.length).toBeGreaterThan(0);
    expect(dispatcher.dispatchTransferStep).toHaveBeenCalled();
  }, 30_000);

  test('includes per-asset checksum in end row when verifyChecksums is enabled', async () => {
    const { streamBatches, dispatcher } = mockPushDispatcher();
    const provider = createRemoteStrapiDestinationProvider({
      ...defaultOptions,
      verifyChecksums: true,
    });
    provider.dispatcher = dispatcher as unknown as typeof provider.dispatcher;

    const writable = provider.createAssetsWriteStream();
    if (writable instanceof Promise) {
      throw new Error('Expected synchronous Writable');
    }

    const payload = [Buffer.from('hello'), Buffer.from(' world')];
    const stream = Readable.from(payload);
    const asset: IAsset = {
      filename: 'checksum.bin',
      filepath: '/tmp/checksum.bin',
      stats: { size: 11 } as IAsset['stats'],
      metadata: { id: 1 },
      stream,
    };

    await writeOneAsset(writable, asset);

    const endItem = streamBatches.flat().find((i) => (i as { action: string }).action === 'end') as
      | { checksum?: { algorithm: string; value: string } }
      | undefined;

    const expected = createHash('sha256').update(Buffer.concat(payload)).digest('hex');
    expect(endItem?.checksum).toEqual({ algorithm: 'sha256', value: expected });
  });

  test('does not include checksum in end row when verifyChecksums is disabled', async () => {
    const { streamBatches, dispatcher } = mockPushDispatcher();
    const provider = createRemoteStrapiDestinationProvider({
      ...defaultOptions,
      verifyChecksums: false,
    });
    provider.dispatcher = dispatcher as unknown as typeof provider.dispatcher;

    const writable = provider.createAssetsWriteStream();
    if (writable instanceof Promise) {
      throw new Error('Expected synchronous Writable');
    }

    const stream = Readable.from([Buffer.from('abc')]);
    const asset: IAsset = {
      filename: 'no-checksum.bin',
      filepath: '/tmp/no-checksum.bin',
      stats: { size: 3 } as IAsset['stats'],
      metadata: { id: 1 },
      stream,
    };

    await writeOneAsset(writable, asset);

    const endItem = streamBatches.flat().find((i) => (i as { action: string }).action === 'end') as
      | { checksum?: { algorithm: string; value: string } }
      | undefined;

    expect(endItem?.checksum).toBeUndefined();
  });
});
