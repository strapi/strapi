import { PassThrough } from 'stream';

import { createTransaction } from '../../../../utils/transaction';
import { createAssetsDestinationWritable } from '../assets-destination-writable';
import {
  createStrapiWithQuery,
  pathAwareUploadStream,
  uploadedKeys,
  waitForUploadStream,
  writeAsset,
} from './assets-destination-writable.test-utils';

describe('createAssetsDestinationWritable (sidecar fallback)', () => {
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

  // beforeTransfer has already deleted the destination assets, and the backup is removed once
  // the stage finishes, so a files-only restore must still upload the bytes.
  test('restores files-only bytes at the stored key when the sidecar is missing', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(pathAwareUploadStream);
    const row = {
      id: 42,
      hash: 'path_hash',
      ext: '.bin',
      url: '/uploads/nested/source/path_hash.bin',
      path: 'nested/source',
      formats: null,
    };
    const mockFindMany = jest.fn().mockResolvedValue([row]);
    const mockFindOne = jest.fn().mockResolvedValue(row);
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
      restoreMediaEntitiesContent: false,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'path_hash.bin',
      filepath: '/path_hash.bin',
      stats: { size: 5 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'path_hash',
        name: 'path_hash.bin',
        ext: '.bin',
        id: 0,
        url: '/path_hash.bin',
        size: 5,
        mime: 'application/octet-stream',
      },
    });

    passThrough.end(Buffer.from('hello'));
    await waitForUploadStream(uploadStream);

    expect(uploadStream).toHaveBeenCalledTimes(1);
    expect(uploadedKeys(uploadStream)).toEqual(['nested/source/path_hash.bin']);
    // A files-only restore never mutates the media library.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('Recovered provider path metadata via hash "path_hash"')
    );

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('warns but still uploads files-only bytes when no row provides the provider path', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(pathAwareUploadStream);
    const mockUpdate = jest.fn().mockResolvedValue(null);
    const onWarning = jest.fn();
    const strapi = createStrapiWithQuery(uploadStream, { update: mockUpdate });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: false,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'orphan_hash.bin',
      filepath: '/orphan_hash.bin',
      stats: { size: 5 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'orphan_hash',
        name: 'orphan_hash.bin',
        ext: '.bin',
        id: 0,
        url: '/orphan_hash.bin',
        size: 5,
        mime: 'application/octet-stream',
      },
    });

    passThrough.end(Buffer.from('hello'));
    await waitForUploadStream(uploadStream);

    expect(uploadedKeys(uploadStream)).toEqual(['orphan_hash.bin']);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('without its provider path metadata')
    );
    // An unknown hash cannot be named by any stored URL: exported assets are keyed `hash + ext`.
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('no stored URL names this object')
    );

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  // Records sharing an exact hash share the bytes, so the asset can be restored at every key
  // they name instead of guessing one — none of them is left pointing at a deleted object.
  test('restores files-only bytes at every candidate path when the hash is ambiguous', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(pathAwareUploadStream);
    const rows = [
      {
        id: 7,
        hash: 'dupe_hash',
        ext: '.bin',
        url: '/uploads/nested/a/dupe_hash.bin',
        path: 'nested/a',
        formats: null,
      },
      {
        id: 8,
        hash: 'dupe_hash',
        ext: '.bin',
        url: '/uploads/nested/b/dupe_hash.bin',
        path: 'nested/b',
        formats: null,
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
      restoreMediaEntitiesContent: false,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'dupe_hash.bin',
      filepath: '/dupe_hash.bin',
      stats: { size: 5 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'dupe_hash',
        name: 'dupe_hash.bin',
        ext: '.bin',
        id: 0,
        url: '/dupe_hash.bin',
        size: 5,
        mime: 'application/octet-stream',
      },
    });

    passThrough.end(Buffer.from('hello'));

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    expect(uploadedKeys(uploadStream)).toEqual([
      'nested/a/dupe_hash.bin',
      'nested/b/dupe_hash.bin',
    ]);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('stored under 2 different provider paths')
    );

    transaction.end();
  });

  test('uploads once when ambiguous records share a provider path, without reusing their metadata', async () => {
    const passThrough = new PassThrough();
    const uploadInputs: { path?: string; provider_metadata?: unknown }[] = [];
    const uploadStream = jest.fn(
      async (file: {
        hash: string;
        ext?: string;
        path?: string;
        url?: string;
        provider_metadata?: Record<string, unknown>;
      }) => {
        uploadInputs.push({ path: file.path, provider_metadata: file.provider_metadata });
        await pathAwareUploadStream(file);
      }
    );
    const rows = [
      {
        id: 7,
        hash: 'dupe_hash',
        ext: '.bin',
        url: '/uploads/shared/dupe_hash.bin',
        path: 'shared',
        provider_metadata: { public_id: 'shared/dupe_hash-7' },
        formats: null,
      },
      {
        id: 8,
        hash: 'dupe_hash',
        ext: '.bin',
        url: '/uploads/shared/dupe_hash.bin',
        path: 'shared',
        provider_metadata: { public_id: 'shared/dupe_hash-8' },
        formats: null,
      },
    ];
    const mockFindMany = jest.fn().mockResolvedValue(rows);
    const mockFindOne = jest
      .fn()
      .mockImplementation(({ where: { id } }) =>
        Promise.resolve(rows.find((row) => row.id === id) ?? null)
      );
    const onWarning = jest.fn();

    const strapi = createStrapiWithQuery(uploadStream, {
      findOne: mockFindOne,
      findMany: mockFindMany,
    });
    const transaction = createTransaction(strapi);
    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => undefined,
      restoreMediaEntitiesContent: false,
      removeAssetsBackup: async () => Promise.resolve(),
      onWarning,
    });

    await writeAsset(stream, {
      filename: 'dupe_hash.bin',
      filepath: '/dupe_hash.bin',
      stats: { size: 5 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'dupe_hash',
        name: 'dupe_hash.bin',
        ext: '.bin',
        id: 0,
        url: '/dupe_hash.bin',
        size: 5,
        mime: 'application/octet-stream',
      },
    });

    passThrough.end(Buffer.from('hello'));

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    expect(uploadInputs).toEqual([{ path: 'shared', provider_metadata: undefined }]);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('multiple media library records sharing one provider path')
    );

    transaction.end();
  });

  test('uploads a missing-sidecar original at the row path and stores returned provider metadata', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(pathAwareUploadStream);
    const row = {
      id: 42,
      hash: 'photo_abc123',
      ext: '.png',
      url: '/uploads/library/photo_abc123.png',
      path: 'library',
      provider_metadata: { public_id: 'library/photo_abc123' },
      formats: null,
    };
    const mockFindMany = jest.fn().mockResolvedValue([row]);
    const mockFindOne = jest.fn().mockResolvedValue(row);
    const mockUpdate = jest.fn().mockResolvedValue(null);

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
      onWarning: jest.fn(),
    });

    await writeAsset(stream, {
      filename: 'photo_abc123.png',
      filepath: '/photo_abc123.png',
      stats: { size: 5 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'photo_abc123',
        name: 'photo_abc123.png',
        ext: '.png',
        id: 0,
        url: '/photo_abc123.png',
        size: 5,
        mime: 'image/png',
      },
    });

    passThrough.end(Buffer.from('hello'));
    await waitForUploadStream(uploadStream);

    expect(uploadedKeys(uploadStream)).toEqual(['library/photo_abc123.png']);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        url: '/cdn/library/photo_abc123.png',
        provider: 'local',
        provider_metadata: { key: 'library/photo_abc123.png' },
      },
    });

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('stores provider metadata mutated in place on the hydrated object', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(
      async (file: { url?: string; provider_metadata?: Record<string, unknown> }) => {
        file.url = '/cdn/library/photo_abc123.png';
        if (!file.provider_metadata) {
          file.provider_metadata = {};
        }
        file.provider_metadata.public_id = 'library/photo_abc123-restored';
      }
    );
    const row = {
      id: 42,
      hash: 'photo_abc123',
      ext: '.png',
      url: '/uploads/library/photo_abc123.png',
      path: 'library',
      provider_metadata: { public_id: 'library/photo_abc123' },
      formats: null,
    };
    const mockFindMany = jest.fn().mockResolvedValue([row]);
    const mockFindOne = jest.fn().mockResolvedValue(row);
    const mockUpdate = jest.fn().mockResolvedValue(null);

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
      onWarning: jest.fn(),
    });

    await writeAsset(stream, {
      filename: 'photo_abc123.png',
      filepath: '/photo_abc123.png',
      stats: { size: 5 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'photo_abc123',
        name: 'photo_abc123.png',
        ext: '.png',
        id: 0,
        url: '/photo_abc123.png',
        size: 5,
        mime: 'image/png',
      },
    });

    passThrough.end(Buffer.from('hello'));
    await waitForUploadStream(uploadStream);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        url: '/cdn/library/photo_abc123.png',
        provider: 'local',
        provider_metadata: { public_id: 'library/photo_abc123-restored' },
      },
    });

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });

  test('uploads a missing-sidecar format at the row path and stores its returned provider metadata', async () => {
    const passThrough = new PassThrough();
    const uploadStream = jest.fn(pathAwareUploadStream);
    const row = {
      id: 42,
      hash: 'photo_abc123',
      url: '/uploads/library/photo_abc123.png',
      path: 'library',
      formats: {
        small: {
          hash: 'small_photo_abc123',
          ext: '.png',
          url: '/uploads/library/small_photo_abc123.png',
          provider_metadata: { public_id: 'library/small_photo_abc123' },
        },
      },
    };
    const mockFindMany = jest.fn().mockResolvedValue([row]);
    const mockFindOne = jest.fn().mockResolvedValue(row);
    const mockUpdate = jest.fn().mockResolvedValue(null);

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
      onWarning: jest.fn(),
    });

    await writeAsset(stream, {
      filename: 'small_photo_abc123.png',
      filepath: '/small_photo_abc123.png',
      stats: { size: 5 },
      stream: passThrough,
      metadataFallback: true,
      metadata: {
        hash: 'small_photo_abc123',
        mainHash: 'photo_abc123',
        type: 'small',
        name: 'small_photo_abc123.png',
        ext: '.png',
        id: 0,
        url: '/small_photo_abc123.png',
        size: 5,
        mime: 'image/png',
      },
    });

    passThrough.end(Buffer.from('hello'));
    await waitForUploadStream(uploadStream);

    expect(uploadedKeys(uploadStream)).toEqual(['library/small_photo_abc123.png']);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        formats: {
          small: expect.objectContaining({
            url: '/cdn/library/small_photo_abc123.png',
            provider_metadata: { key: 'library/small_photo_abc123.png' },
          }),
        },
        provider: 'local',
      },
    });

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    transaction.end();
  });
});
