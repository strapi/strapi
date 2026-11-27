import { Writable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import { afterEach, describe, expect, test, vi } from 'vitest';

import cloudinaryProvider from '../index';

type UploadCallback = (err: unknown, image: unknown) => void;

// Mocks the SDK upload, applying the documented `folder` prefix to the public_id. With
// `resource_type: 'auto'`, Cloudinary detects the type from the file: `detectedResourceType`.
const mockUploadStream = (
  detectedResourceType = 'image',
  method: 'upload_stream' | 'upload_chunked_stream' = 'upload_stream'
) =>
  vi.spyOn(cloudinary.uploader, method).mockImplementation(
    ((
      options: { folder?: string; public_id: string; resource_type?: string },
      callback: UploadCallback
    ) =>
      new Writable({
        write: (_chunk, _encoding, done) => done(),
        final(done) {
          const publicId = options.folder
            ? `${options.folder}/${options.public_id}`
            : options.public_id;
          const resourceType =
            options.resource_type && options.resource_type !== 'auto'
              ? options.resource_type
              : detectedResourceType;
          callback(null, { public_id: publicId, resource_type: resourceType, secure_url: 'url' });
          done();
        },
      })) as unknown as typeof cloudinary.uploader.upload_stream
  );

const createFiles = (oldPublicId: string) => {
  const newFile = {
    name: 'photo.png',
    hash: 'photo_123',
    ext: '.png',
    mime: 'image/png',
    size: 1,
    sizeInBytes: 1000,
    url: '',
    buffer: Buffer.from('v2'),
    path: undefined as string | undefined,
  };
  const oldFile = {
    ...newFile,
    buffer: undefined,
    provider_metadata: { public_id: oldPublicId, resource_type: 'image' },
  };
  return { newFile, oldFile };
};

describe('Cloudinary provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('init returns the methods the upload plugin requires', () => {
    const provider = cloudinaryProvider.init({ cloud_name: 'demo' });

    expect(provider.delete).toBeTypeOf('function');
    expect(provider.uploadStream).toBeTypeOf('function');
    expect(provider.upload).toBeTypeOf('function');
  });

  test('delete destroys the stored asset', async () => {
    const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
    const provider = cloudinaryProvider.init({ cloud_name: 'demo' });

    await provider.delete({
      name: 'photo.png',
      hash: 'photo_123',
      mime: 'image/png',
      size: 1,
      sizeInBytes: 1000,
      url: 'https://res.cloudinary.com/demo/image/upload/photo_123.png',
      provider_metadata: { public_id: 'photo_123', resource_type: 'image' },
    });

    expect(destroy).toHaveBeenCalledWith('photo_123', { resource_type: 'image', invalidate: true });
  });

  describe('replace', () => {
    test('keeps the new asset when a folder makes it land on the old public_id', async () => {
      mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('assets/photo_123');

      await provider.replaceStream(newFile, oldFile, { folder: 'assets' });

      expect(newFile).toMatchObject({ provider_metadata: { public_id: 'assets/photo_123' } });
      expect(destroy).not.toHaveBeenCalled();
    });

    test('overwrites and invalidates when a folder makes it land on the old public_id', async () => {
      const uploadStream = mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('assets/photo_123');

      await provider.replaceStream(newFile, oldFile, {
        folder: 'assets',
        overwrite: false,
        invalidate: false,
      });

      expect(uploadStream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'assets',
          resource_type: 'auto',
          overwrite: true,
          invalidate: true,
        }),
        expect.any(Function)
      );
      expect(destroy).not.toHaveBeenCalled();
    });

    test('destroys the old asset when the new public_id differs', async () => {
      mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('old/photo_123');

      await provider.replaceStream(newFile, oldFile, { folder: 'new' });

      expect(newFile).toMatchObject({ provider_metadata: { public_id: 'new/photo_123' } });
      expect(destroy).toHaveBeenCalledWith('old/photo_123', {
        resource_type: 'image',
        invalidate: true,
      });
    });

    test('destroys the old asset when the new one has another resource_type', async () => {
      mockUploadStream('video');
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('assets/photo_123');

      await provider.replaceStream(newFile, oldFile, { folder: 'assets' });

      expect(newFile).toMatchObject({
        provider_metadata: { public_id: 'assets/photo_123', resource_type: 'video' },
      });
      expect(destroy).toHaveBeenCalledWith('assets/photo_123', {
        resource_type: 'image',
        invalidate: true,
      });
    });

    test('overwrites in place when the public_id is the hash', async () => {
      const uploadStream = mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('photo_123');

      await provider.replace(newFile, oldFile, {
        public_id: 'other',
        overwrite: false,
        invalidate: false,
      });

      expect(uploadStream).toHaveBeenCalledWith(
        expect.objectContaining({ public_id: 'photo_123', overwrite: true, invalidate: true }),
        expect.any(Function)
      );
      expect(newFile).toMatchObject({ provider_metadata: { public_id: 'photo_123' } });
      expect(destroy).not.toHaveBeenCalled();
    });

    test('ignores a folder on an in-place replace, so the asset does not move', async () => {
      const uploadStream = mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('photo_123');

      await provider.replaceStream(newFile, oldFile, { folder: 'assets' });

      expect(uploadStream.mock.calls[0][0]).not.toHaveProperty('folder');
      expect(newFile).toMatchObject({ provider_metadata: { public_id: 'photo_123' } });
      expect(destroy).not.toHaveBeenCalled();
    });

    test('overwrites and invalidates when the file path makes it land on the old public_id', async () => {
      const uploadStream = mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('assets/photo_123');
      newFile.path = 'assets';

      await provider.replaceStream(newFile, oldFile, { overwrite: false, invalidate: false });

      expect(uploadStream).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'assets', overwrite: true, invalidate: true }),
        expect.any(Function)
      );
      expect(newFile).toMatchObject({ provider_metadata: { public_id: 'assets/photo_123' } });
      expect(destroy).not.toHaveBeenCalled();
    });

    test('ignores the file path on an in-place replace, so the asset does not move', async () => {
      const uploadStream = mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('photo_123');
      newFile.path = 'assets';

      await provider.replaceStream(newFile, oldFile);

      expect(uploadStream.mock.calls[0][0]).not.toHaveProperty('folder');
      expect(newFile).toMatchObject({ provider_metadata: { public_id: 'photo_123' } });
      expect(destroy).not.toHaveBeenCalled();
    });

    // The upload plugin replaces the main file and its formats in one Promise.all and updates the
    // file row only when all of them resolve, so a failed format must leave every asset in place.
    test('a failed format replace keeps the asset the file row points at', async () => {
      const stored = new Set(['photo_123', 'thumbnail_photo_123']);
      vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(
        ((options: { folder?: string; public_id: string }, callback: UploadCallback) =>
          new Writable({
            write: (_chunk, _encoding, done) => done(),
            final(done) {
              const publicId = options.folder
                ? `${options.folder}/${options.public_id}`
                : options.public_id;
              if (publicId.endsWith('thumbnail_photo_123')) {
                callback(new Error('network error'), undefined);
              } else {
                stored.add(publicId);
                callback(null, { public_id: publicId, resource_type: 'image', secure_url: 'url' });
              }
              done();
            },
          })) as unknown as typeof cloudinary.uploader.upload_stream
      );
      vi.spyOn(cloudinary.uploader, 'destroy').mockImplementation((async (publicId: string) => ({
        result: stored.delete(publicId) ? 'ok' : 'not found',
      })) as unknown as typeof cloudinary.uploader.destroy);
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const main = createFiles('photo_123');
      const thumbnail = createFiles('thumbnail_photo_123');
      thumbnail.newFile.hash = 'thumbnail_photo_123';
      main.newFile.path = 'assets';

      const results = await Promise.allSettled([
        provider.replaceStream(main.newFile, main.oldFile, { folder: 'assets' }),
        provider.replaceStream(thumbnail.newFile, thumbnail.oldFile, { folder: 'assets' }),
      ]);

      expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
      expect(stored).toEqual(new Set(['photo_123', 'thumbnail_photo_123']));
    });

    test('keeps the stored resource_type when it overwrites in place', async () => {
      const uploadStream = mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('photo_123');
      oldFile.provider_metadata.resource_type = 'video';

      await provider.replaceStream(newFile, oldFile);

      expect(uploadStream).toHaveBeenCalledWith(
        expect.objectContaining({ public_id: 'photo_123', resource_type: 'video' }),
        expect.any(Function)
      );
      expect(newFile).toMatchObject({
        provider_metadata: { public_id: 'photo_123', resource_type: 'video' },
      });
      expect(destroy).not.toHaveBeenCalled();
    });

    test('treats a stored asset without resource_type as an image', async () => {
      mockUploadStream('video');
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('assets/photo_123');
      const legacyOldFile = { ...oldFile, provider_metadata: { public_id: 'assets/photo_123' } };

      await provider.replaceStream(newFile, legacyOldFile, { folder: 'assets' });

      expect(destroy).toHaveBeenCalledWith('assets/photo_123', {
        resource_type: 'image',
        invalidate: true,
      });
    });

    test('uploads without destroying when the old file has no provider_metadata', async () => {
      const uploadStream = mockUploadStream();
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('photo_123');
      const { provider_metadata: _metadata, ...oldFileWithoutMetadata } = oldFile;

      await provider.replaceStream(newFile, oldFileWithoutMetadata);

      expect(uploadStream).toHaveBeenCalledWith(
        expect.objectContaining({ public_id: 'photo_123', overwrite: true, invalidate: true }),
        expect.any(Function)
      );
      expect(destroy).not.toHaveBeenCalled();
    });

    test('overwrites and invalidates with a chunked upload for large files', async () => {
      const uploadChunkedStream = mockUploadStream('image', 'upload_chunked_stream');
      const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('assets/photo_123');
      newFile.size = 1000 * 99;

      await provider.replaceStream(newFile, oldFile, {
        folder: 'assets',
        overwrite: false,
        invalidate: false,
      });

      expect(uploadChunkedStream).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'assets', overwrite: true, invalidate: true }),
        expect.any(Function)
      );
      expect(destroy).not.toHaveBeenCalled();
    });

    test('rejects when destroying the old asset fails', async () => {
      mockUploadStream();
      vi.spyOn(cloudinary.uploader, 'destroy').mockRejectedValue(new Error('boom'));
      const provider = cloudinaryProvider.init({ cloud_name: 'demo' });
      const { newFile, oldFile } = createFiles('old/photo_123');

      await expect(provider.replaceStream(newFile, oldFile, { folder: 'new' })).rejects.toThrow(
        'Error deleting on cloudinary: boom'
      );
    });
  });
});
