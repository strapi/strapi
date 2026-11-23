import { Writable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import { afterEach, describe, expect, test, vi } from 'vitest';

import cloudinaryProvider from '../index';

type UploadCallback = (err: unknown, image: unknown) => void;

// Mocks the SDK upload, applying the documented `folder` prefix to the public_id.
const mockUploadStream = () =>
  vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(
    ((options: { folder?: string; public_id: string }, callback: UploadCallback) =>
      new Writable({
        write: (_chunk, _encoding, done) => done(),
        final(done) {
          const publicId = options.folder
            ? `${options.folder}/${options.public_id}`
            : options.public_id;
          callback(null, { public_id: publicId, resource_type: 'image', secure_url: 'url' });
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
  });
});
