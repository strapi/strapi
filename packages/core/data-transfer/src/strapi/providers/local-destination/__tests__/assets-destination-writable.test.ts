import { PassThrough, Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset } from '../../../../types';
import { createTransaction } from '../../../../utils/transaction';
import { createAssetsDestinationWritable } from '../assets-destination-writable';

const baseMetadata: IAsset['metadata'] = {
  hash: 'h',
  name: 'a',
  id: 1,
  url: 'a.jpg',
  size: 10,
  mime: 'image/jpeg',
};

const createMockStrapi = (uploadStream: jest.Mock) =>
  ({
    config: {
      get(service: string) {
        if (service === 'plugin::upload') {
          return { provider: 'local' };
        }
        return {};
      },
    },
    db: {
      transaction(fn: (arg: { trx: object; rollback: () => Promise<void> }) => Promise<void>) {
        fn({ trx: {}, rollback: async () => Promise.resolve() });
        return Promise.resolve();
      },
      query: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue({ id: 1, url: 'x.jpg', formats: {} }),
        update: jest.fn().mockResolvedValue(null),
      })),
    },
    plugin(name: string) {
      if (name === 'upload') {
        return { provider: { uploadStream } };
      }
      return {};
    },
  }) as unknown as Core.Strapi;

const createTestWritable = (uploadStream: jest.Mock) => {
  const strapi = createMockStrapi(uploadStream);
  const transaction = createTransaction(strapi);
  const stream = createAssetsDestinationWritable({
    strapi,
    transaction,
    resolveUploadFileId: () => 1,
    restoreMediaEntitiesContent: false,
    removeAssetsBackup: async () => Promise.resolve(),
  });
  return { stream, transaction };
};

const writeAsset = (stream: ReturnType<typeof createTestWritable>['stream'], asset: IAsset) =>
  new Promise<void>((resolve, reject) => {
    stream.write(asset, (err) => (err ? reject(err) : resolve()));
  });

const waitForUploadStream = (uploadStream: jest.Mock, timeoutMs = 500) =>
  new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      if (uploadStream.mock.calls.length > 0) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for uploadStream'));
        return;
      }
      setImmediate(poll);
    };
    poll();
  });

const readAll = async (readable: Readable) => {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/** Mimics upload providers (e.g. Strapi Cloud) that sync-read the stream on uploadStream entry. */
const cloudSyncReadUploadStream = (file: { stream: Readable }) => {
  const chunk = file.stream.read();
  Buffer.from(chunk as Buffer);
};

/**
 * Replica of develop's pre-#26086 write path: wrap the PassThrough in Readable.from() and call
 * uploadStream immediately — before the push handler has written any chunks.
 */
const invokeDevelopStyleUpload = (passThrough: PassThrough) => {
  const uploadData = {
    ...baseMetadata,
    stream: Readable.from(passThrough),
  };
  cloudSyncReadUploadStream(uploadData);
};

/**
 * Push sends start + chunks + end in one batch; `write()` must return immediately so the
 * PassThrough can be fed in the same batch (avoids deadlock).  uploadStream is intentionally
 * deferred until the PassThrough ends — this ensures the provider receives a fully-populated
 * synchronous Readable instead of a lazy async wrapper (fixes Buffer.from(undefined) crashes
 * seen with certain upload providers when stream.read() is called before data is buffered).
 */
describe('createAssetsDestinationWritable (push transfer)', () => {
  test('write() callback fires immediately; uploadStream is called only after the PassThrough ends', async () => {
    let releaseUpload!: (value?: unknown) => void;
    const uploadBlocked = new Promise((resolve) => {
      releaseUpload = resolve;
    });

    let uploadFinished = false;
    const uploadStream = jest.fn(async () => {
      await uploadBlocked;
      uploadFinished = true;
    });

    const { stream, transaction } = createTestWritable(uploadStream);

    const assetStream = Readable.from([Buffer.from('hello')]);

    const file: IAsset = {
      filename: 'a.jpg',
      filepath: '/a',
      stats: { size: 10 },
      stream: assetStream,
      metadata: baseMetadata,
    };

    // write() must resolve quickly (no deadlock) even though the upload is blocked.
    const writeSettled = new Promise<void>((resolve, reject) => {
      stream.write(file, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        writeSettled,
        new Promise<void>((_, reject) => {
          timeoutId = setTimeout(
            () =>
              reject(
                new Error('Timed out: write() callback did not fire promptly — possible deadlock')
              ),
            200
          );
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }

    // uploadStream is deferred until the PassThrough ends (async), so it may not have been
    // called at the exact moment the write callback fires. Yield to let pending microtasks
    // and stream events settle.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(uploadStream).toHaveBeenCalled();
    expect(uploadFinished).toBe(false);

    releaseUpload();

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(uploadFinished).toBe(true);

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    transaction.end();
  });

  test('defers uploadStream until PassThrough chunks arrive after write() returns (push batch order)', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const { stream, transaction } = createTestWritable(uploadStream);

    const file: IAsset = {
      filename: 'a.jpg',
      filepath: '/a',
      stats: { size: 5 },
      stream: passThrough,
      metadata: baseMetadata,
    };

    await writeAsset(stream, file);

    expect(uploadStream).not.toHaveBeenCalled();

    passThrough.write(Buffer.from('hel'));
    passThrough.write(Buffer.from('lo'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(uploadStream).toHaveBeenCalledTimes(1);
    const uploadData = uploadStream.mock.calls[0][0] as { stream: Readable };
    expect(await readAll(uploadData.stream)).toEqual(Buffer.from('hello'));

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('uploadStream receives a readable whose first sync read() is not null (cloud provider pattern)', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(async (file: { stream: Readable }) => {
      const firstRead = file.stream.read();
      expect(firstRead).not.toBeNull();
      expect(Buffer.isBuffer(firstRead)).toBe(true);
      // Some upload providers synchronously wrap the first chunk — must not be undefined.
      Buffer.from(firstRead as Buffer);
    });

    const { stream, transaction } = createTestWritable(uploadStream);

    await writeAsset(stream, {
      filename: 'a.jpg',
      filepath: '/a',
      stats: { size: 5 },
      stream: passThrough,
      metadata: baseMetadata,
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('Readable.from(PassThrough) before data arrives returns null on first sync read (documents the bug)', () => {
    const passThrough = new PassThrough();
    const lazyReadable = Readable.from(passThrough);
    expect(lazyReadable.read()).toBeNull();
  });
});

/**
 * Before/after proof for #26086. The develop-style tests fail against `develop`'s
 * assets-destination-writable.ts; the fixed-writable test fails there too (2 failing tests).
 * All pass once uploadStream is deferred until the PassThrough ends.
 */
describe('regression: pre-#26086 immediate Readable.from(PassThrough) (#26086)', () => {
  test('develop pattern: sync-read uploadStream throws before PassThrough is fed', () => {
    const passThrough = new PassThrough();

    expect(() => invokeDevelopStyleUpload(passThrough)).toThrow(
      /first argument must be of type string or an instance of Buffer/i
    );

    // Chunks arriving afterward cannot recover — the upload already failed.
    passThrough.write(Buffer.from('hello'));
    passThrough.end();
  });

  test('fixed writable: same PassThrough batch order succeeds where develop pattern throws', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(async (file: { stream: Readable }) => {
      cloudSyncReadUploadStream(file);
    });
    const { stream, transaction } = createTestWritable(uploadStream);

    await writeAsset(stream, {
      filename: 'a.jpg',
      filepath: '/a',
      stats: { size: 5 },
      stream: passThrough,
      metadata: baseMetadata,
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);
    expect(uploadStream).toHaveBeenCalledTimes(1);

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });
});
