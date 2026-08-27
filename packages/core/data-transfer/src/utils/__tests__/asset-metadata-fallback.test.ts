import {
  buildFallbackAssetMetadataFromFilename,
  isMissingAssetMetadataSidecarError,
  MissingArchiveEntryError,
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
  });

  test('uses octet-stream when extension is unknown', () => {
    const metadata = buildFallbackAssetMetadataFromFilename('file.bin', { size: 100 });

    expect(metadata.hash).toBe('file');
    expect(metadata.ext).toBe('.bin');
    expect(metadata.mime).toBe('application/octet-stream');
  });
});

describe('isMissingAssetMetadataSidecarError', () => {
  test('accepts ENOENT from directory sources', () => {
    const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    expect(isMissingAssetMetadataSidecarError(error)).toBe(true);
  });

  test('accepts tar/file missing-entry errors', () => {
    expect(
      isMissingAssetMetadataSidecarError(new MissingArchiveEntryError('assets/metadata/x.json'))
    ).toBe(true);
  });

  test('rejects malformed JSON and other failures', () => {
    expect(isMissingAssetMetadataSidecarError(new SyntaxError('Unexpected token'))).toBe(false);
    expect(isMissingAssetMetadataSidecarError(new Error('EACCES: permission denied'))).toBe(false);
  });
});

describe('asset fallback provenance', () => {
  const metadata = buildFallbackAssetMetadataFromFilename('photo.jpg', { size: 100 });

  test('persists the fallback marker across archive rewrites without exposing it as metadata', () => {
    const serialized = serializeAssetSidecar({ metadata, metadataFallback: true });
    const parsed = parseAssetSidecar(JSON.parse(serialized));

    expect(parsed.metadataFallback).toBe(true);
    expect(parsed.metadata).toEqual(metadata);
    expect(parsed.metadata).not.toHaveProperty('metadataFallback');
  });

  test('rejects non-object sidecars', () => {
    expect(() => parseAssetSidecar([])).toThrow('must be a JSON object');
  });
});
