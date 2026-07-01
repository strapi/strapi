import { buildFallbackAssetMetadataFromFilename } from '../asset-metadata-fallback';

describe('buildFallbackAssetMetadataFromFilename', () => {
  test('derives hash, ext, and mime from export-style filename', () => {
    const metadata = buildFallbackAssetMetadataFromFilename('abc123_def.jpeg', { size: 2048 });

    expect(metadata).toMatchObject({
      id: 0,
      name: 'abc123_def.jpeg',
      hash: 'abc123_def',
      ext: '.jpeg',
      mime: 'image/jpeg',
      url: '/abc123_def.jpeg',
    });
    expect(metadata.size).toBeGreaterThan(0);
  });

  test('uses octet-stream when extension is unknown', () => {
    const metadata = buildFallbackAssetMetadataFromFilename('file.bin', { size: 100 });

    expect(metadata.hash).toBe('file');
    expect(metadata.ext).toBe('.bin');
    expect(metadata.mime).toBe('application/octet-stream');
  });
});
