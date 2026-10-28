import { isAllowedAssetType } from '../isAllowedAssetType';

describe('isAllowedAssetType', () => {
  it('allows everything when the field has no restriction', () => {
    expect(isAllowedAssetType(undefined, 'application/pdf')).toBe(true);
    expect(isAllowedAssetType(null, 'image/png')).toBe(true);
    expect(isAllowedAssetType([], 'video/mp4')).toBe(true);
  });

  it('matches images, videos and audio on the mime family', () => {
    expect(isAllowedAssetType(['images'], 'image/png')).toBe(true);
    expect(isAllowedAssetType(['images'], 'video/mp4')).toBe(false);
    expect(isAllowedAssetType(['videos', 'audios'], 'audio/mpeg')).toBe(true);
  });

  it('treats "files" as everything that is not an image, a video or audio', () => {
    expect(isAllowedAssetType(['files'], 'application/pdf')).toBe(true);
    expect(isAllowedAssetType(['files'], 'text/csv')).toBe(true);
    expect(isAllowedAssetType(['files'], 'image/png')).toBe(false);
  });

  it('only looks at the MIME family, like the legacy picker', () => {
    // Disk images and OpenDocument drawings mention "image" but are files.
    expect(isAllowedAssetType(['images'], 'application/x-iso9660-image')).toBe(false);
    expect(isAllowedAssetType(['files'], 'application/x-iso9660-image')).toBe(true);
    expect(isAllowedAssetType(['files'], 'application/vnd.oasis.opendocument.image')).toBe(true);
  });

  it('accepts a single type written as a string, as a schema may hold it', () => {
    expect(isAllowedAssetType('images', 'image/png')).toBe(true);
    expect(isAllowedAssetType('images', 'application/pdf')).toBe(false);
  });

  it('rejects an asset without a mime type once the field is restricted', () => {
    expect(isAllowedAssetType(['files'], '')).toBe(false);
    expect(isAllowedAssetType(['images'], undefined)).toBe(false);
  });
});
