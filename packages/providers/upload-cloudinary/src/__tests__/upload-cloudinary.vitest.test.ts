import { v2 as cloudinary } from 'cloudinary';
import { afterEach, describe, expect, test, vi } from 'vitest';

import cloudinaryProvider from '../index';

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
});
