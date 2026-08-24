import { PassThrough } from 'stream';

import { createTransaction } from '../../../../utils/transaction';
import { createAssetsDestinationWritable } from '../assets-destination-writable';
import {
  createStrapiWithQuery,
  waitForUploadStream,
  writeAsset,
} from './assets-destination-writable.test-utils';

describe('createAssetsDestinationWritable (hash resolution)', () => {
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
    expect(onWarning).not.toHaveBeenCalledWith(
      expect.stringContaining('could not update the media library record')
    );
    expect(mockUpdate).not.toHaveBeenCalled();

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('Asset hash fallback summary: 0 resolved, 1 ambiguous, 0 unmatched')
    );
    transaction.end();
  });

  test('does not continue to mainHash after an ambiguous exact hash', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const rows = [
      { id: 10, hash: 'small_clash' },
      { id: 20, hash: 'small_clash' },
      {
        id: 30,
        hash: 'clash',
        formats: { small: { hash: 'other_small_hash', url: 'old-small.png' } },
      },
    ];
    const mockFindMany = jest.fn().mockResolvedValue(rows);
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
      filename: 'small_clash.png',
      filepath: '/small_clash.png',
      stats: { size: 10 },
      stream: passThrough,
      metadata: {
        hash: 'small_clash',
        mainHash: 'clash',
        type: 'small',
        name: 'small_clash.png',
        id: 0,
        url: '/small_clash.png',
        size: 10,
        mime: 'image/png',
      },
    });

    passThrough.end(Buffer.from('hello'));
    await waitForUploadStream(uploadStream);

    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('Ambiguous hash "small_clash"'));
    expect(onWarning).not.toHaveBeenCalledWith(
      expect.stringContaining('Resolved upload file ID via hash "clash"')
    );
    expect(mockUpdate).not.toHaveBeenCalled();

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
      metadataFallback: true,
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

  test('does not use a filename-derived format prefix to select a parent row', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const parent = {
      id: 8,
      hash: 'logo',
      formats: { small: { hash: 'small_other_hash', url: 'old-small.png' } },
    };
    const mockFindMany = jest.fn().mockResolvedValue([parent]);
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
      filename: 'small_logo.png',
      filepath: '/small_logo.png',
      stats: { size: 10 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'small_logo',
        mainHash: 'logo',
        type: 'small',
        name: 'small_logo.png',
        id: 0,
        url: '/small_logo.png',
        size: 10,
        mime: 'image/png',
      },
    });

    passThrough.end(Buffer.from('hello'));
    await waitForUploadStream(uploadStream);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(parent.formats.small.url).toBe('old-small.png');
    expect(onWarning).not.toHaveBeenCalledWith(
      expect.stringContaining('Resolved upload file ID via hash "logo"')
    );
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('could not update the media library record')
    );

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
