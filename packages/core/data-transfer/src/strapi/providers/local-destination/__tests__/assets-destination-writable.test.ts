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

describe('createAssetsDestinationWritable (asset metadata resilience)', () => {
  const createStrapiWithQuery = (
    uploadStream: jest.Mock,
    {
      findOne = jest.fn(),
      findMany = jest.fn().mockResolvedValue([]),
      update = jest.fn().mockResolvedValue(null),
    }: {
      findOne?: jest.Mock;
      findMany?: jest.Mock;
      update?: jest.Mock;
    } = {}
  ) =>
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
          findOne,
          findMany,
          update,
        })),
      },
      plugin(name: string) {
        if (name === 'upload') {
          return { provider: { uploadStream } };
        }
        return {};
      },
    }) as unknown as Core.Strapi;

  test('uploads asset when entity ID mapping is missing but hash matches an existing record', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const mockFindMany = jest.fn().mockResolvedValue([{ id: 42, hash: 'photo_hash' }]);
    const mockFindOne = jest.fn().mockResolvedValue({ id: 42, url: 'old.jpg', formats: {} });
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findOne: mockFindOne,
      findMany: mockFindMany,
      update: mockUpdate,
    });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: true,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'photo.jpg',
      filepath: '/photo.jpg',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'photo_hash',
        name: 'photo.jpg',
        id: 99,
        url: 'photo.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: ['id', 'hash', 'formats'],
      })
    );
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('Resolved upload file ID via hash')
    );
    expect(mockUpdate).toHaveBeenCalled();

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('uploads asset bytes and warns when no file record can be updated', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, { findMany: mockFindMany });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: true,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'orphan.jpg',
      filepath: '/orphan.jpg',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'missing_hash',
        name: 'orphan.jpg',
        id: 1,
        url: 'orphan.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('could not update the media library record')
    );

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('uploads bytes and skips DB update when hash matches multiple records', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const mockFindMany = jest.fn().mockResolvedValue([
      { id: 10, hash: 'dup_hash' },
      { id: 20, hash: 'dup_hash' },
    ]);
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findMany: mockFindMany,
      update: mockUpdate,
    });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: true,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'dup.jpg',
      filepath: '/dup.jpg',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'dup_hash',
        name: 'dup.jpg',
        id: 7,
        url: 'dup.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('Ambiguous hash "dup_hash"'));
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('could not update the media library record')
    );
    expect(mockUpdate).not.toHaveBeenCalled();

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('uploads bytes without DB update when media entities restore is disabled', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const mockFindMany = jest.fn().mockResolvedValue([{ id: 42 }]);
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findMany: mockFindMany,
      update: mockUpdate,
    });
    const transaction = createTransaction(strapi);
    // Mirrors --only files: assets stage runs, but plugin::upload.file is out of entity scope.
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: false,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'photo.jpg',
      filepath: '/photo.jpg',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'photo_hash',
        name: 'photo.jpg',
        id: 99,
        url: 'photo.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(uploadStream).toHaveBeenCalledTimes(1);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(onWarning).not.toHaveBeenCalled();

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('resolves parent file via mainHash for responsive format variants', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const mockFindMany = jest.fn().mockResolvedValue([{ id: 42, hash: 'photo_hash' }]);
    const mockFindOne = jest.fn().mockResolvedValue({
      id: 42,
      url: 'photo.jpg',
      formats: { thumbnail: { hash: 'thumb_hash', url: 'old-thumb.jpg' } },
    });
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findOne: mockFindOne,
      findMany: mockFindMany,
      update: mockUpdate,
    });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: true,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'thumbnail_photo.jpg',
      filepath: '/thumbnail_photo.jpg',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'thumb_hash',
        mainHash: 'photo_hash',
        type: 'thumbnail',
        name: 'thumbnail_photo.jpg',
        id: 99,
        url: 'thumbnail_photo.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: ['id', 'hash', 'formats'],
      })
    );
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('Resolved upload file ID via hash "photo_hash"')
    );

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  // Filename-derived metadata reads `small_logo_abc123.png` as a `small` variant of
  // `logo_abc123`, but the exact hash belongs to an original row.
  test('updates the original row when its hash starts with a default format prefix', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const rows = [
      { id: 7, hash: 'small_logo_abc123', formats: null },
      {
        id: 8,
        hash: 'logo_abc123',
        formats: { small: { hash: 'small_other_hash', url: 'old-small.png' } },
      },
    ];
    const mockFindMany = jest.fn().mockResolvedValue(rows);
    const mockFindOne = jest
      .fn()
      .mockImplementation(({ where: { id } }) =>
        Promise.resolve(rows.find((row) => row.id === id) ?? null)
      );
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findOne: mockFindOne,
      findMany: mockFindMany,
      update: mockUpdate,
    });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: true,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'small_logo_abc123.png',
      filepath: '/small_logo_abc123.png',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'small_logo_abc123',
        mainHash: 'logo_abc123',
        type: 'small',
        name: 'small_logo_abc123.png',
        id: 0,
        url: '/small_logo_abc123.png',
        size: 10,
        mime: 'image/png',
      },
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { url: '/small_logo_abc123.png', provider: 'local' },
    });
    expect(rows[1].formats.small.url).toBe('old-small.png');

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  // Custom breakpoints are unknown to filename parsing, so no `type`/`mainHash` is derived —
  // the variant hash is only findable through the parent row's `formats`.
  test('updates a custom responsive format resolved from the parent formats hashes', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const parent = {
      id: 42,
      hash: 'photo_abc123',
      url: 'photo.png',
      formats: { hero: { hash: 'hero_photo_abc123', url: 'old-hero.png' } },
    };
    const mockFindMany = jest.fn().mockResolvedValue([parent]);
    const mockFindOne = jest.fn().mockResolvedValue(parent);
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findOne: mockFindOne,
      findMany: mockFindMany,
      update: mockUpdate,
    });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: true,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'hero_photo_abc123.png',
      filepath: '/hero_photo_abc123.png',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'hero_photo_abc123',
        name: 'hero_photo_abc123.png',
        id: 0,
        url: '/hero_photo_abc123.png',
        size: 10,
        mime: 'image/png',
      },
    });

    passThrough.write(Buffer.from('hello'));
    passThrough.end();

    await waitForUploadStream(uploadStream);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        formats: { hero: { hash: 'hero_photo_abc123', url: '/hero_photo_abc123.png' } },
        provider: 'local',
      },
    });

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('builds a stage-scoped hash index once and emits an end-of-stage summary', async () => {
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const mockFindMany = jest.fn().mockResolvedValue([
      { id: 1, hash: 'hash_a' },
      { id: 2, hash: 'hash_b' },
    ]);
    const mockFindOne = jest
      .fn()
      .mockImplementation(({ where: { id } }) =>
        Promise.resolve({ id, url: 'old.jpg', formats: {} })
      );
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findOne: mockFindOne,
      findMany: mockFindMany,
      update: mockUpdate,
    });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: true,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    const first = new PassThrough();
    const second = new PassThrough();

    await writeAsset(stream, {
      filename: 'a.jpg',
      filepath: '/a.jpg',
      stats: { size: 10 },
      stream: first,
      metadata: {
        hash: 'hash_a',
        name: 'a.jpg',
        id: 10,
        url: 'a.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    });
    await writeAsset(stream, {
      filename: 'b.jpg',
      filepath: '/b.jpg',
      stats: { size: 10 },
      stream: second,
      metadata: {
        hash: 'hash_b',
        name: 'b.jpg',
        id: 11,
        url: 'b.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    });

    first.end(Buffer.from('a'));
    second.end(Buffer.from('b'));

    await waitForUploadStream(uploadStream);
    await new Promise<void>((resolve) => {
      const startedAt = Date.now();
      const poll = () => {
        if (uploadStream.mock.calls.length >= 2 || Date.now() - startedAt >= 500) {
          resolve();
          return;
        }
        setImmediate(poll);
      };
      poll();
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(2);

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('Asset hash fallback summary: 2 resolved, 0 ambiguous, 0 unmatched')
    );
    transaction.end();
  });
});
