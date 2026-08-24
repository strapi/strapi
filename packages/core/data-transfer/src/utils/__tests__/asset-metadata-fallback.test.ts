import {
  buildFallbackAssetMetadataFromFilename,
  parseAssetSidecar,
  serializeAssetSidecar,
} from '../asset-metadata-fallback';

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
    expect(metadata.mainHash).toBeUndefined();
    expect(metadata.type).toBeUndefined();
  });

  test('uses mime-types lookup and reserves octet-stream for unknown extensions', () => {
    expect(buildFallbackAssetMetadataFromFilename('clip.mov', { size: 100 }).mime).toBe(
      'video/quicktime'
    );
    expect(buildFallbackAssetMetadataFromFilename('archive.zip', { size: 100 }).mime).toBe(
      'application/zip'
    );
    expect(buildFallbackAssetMetadataFromFilename('file.bin', { size: 100 }).mime).toBe(
      'application/octet-stream'
    );
    expect(buildFallbackAssetMetadataFromFilename('file.unknownextxyz', { size: 100 }).mime).toBe(
      'application/octet-stream'
    );
  });

  test('recovers type and mainHash for default responsive-format prefixes', () => {
    const metadata = buildFallbackAssetMetadataFromFilename('thumbnail_we_love_pizza_abc123.jpeg', {
      size: 512,
    });

    expect(metadata).toMatchObject({
      hash: 'thumbnail_we_love_pizza_abc123',
      type: 'thumbnail',
      mainHash: 'we_love_pizza_abc123',
      mime: 'image/jpeg',
    });
  });
});

describe('asset sidecar fallback provenance', () => {
  const metadata = buildFallbackAssetMetadataFromFilename('small_launder.png', { size: 10 });

  test('serializeAssetSidecar records metadataFallback without putting it on IFile when parsed', () => {
    const json = serializeAssetSidecar({ metadata, metadataFallback: true });
    const raw = JSON.parse(json);

    expect(raw.metadataFallback).toBe(true);
    expect(raw.mainHash).toBe('launder');
    expect(raw.type).toBe('small');

    const parsed = parseAssetSidecar(raw);
    expect(parsed.metadataFallback).toBe(true);
    expect(parsed.metadata).not.toHaveProperty('metadataFallback');
    expect(parsed.metadata.mainHash).toBe('launder');
  });

  test('serializeAssetSidecar omits the marker for trusted sidecars', () => {
    const json = serializeAssetSidecar({ metadata, metadataFallback: false });
    const raw = JSON.parse(json);

    expect(raw).not.toHaveProperty('metadataFallback');
    expect(parseAssetSidecar(raw).metadataFallback).toBe(false);
  });

  test('parseAssetSidecar rejects non-objects', () => {
    expect(() => parseAssetSidecar('nope')).toThrow(/JSON object/);
    expect(() => parseAssetSidecar(null)).toThrow(/JSON object/);
  });
});
