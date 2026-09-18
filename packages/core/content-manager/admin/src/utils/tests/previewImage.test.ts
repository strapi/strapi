import { resolvePreviewImageUrl } from '../previewImage';

describe('resolvePreviewImageUrl', () => {
  it('returns undefined when preview is missing', () => {
    expect(resolvePreviewImageUrl(undefined)).toBeUndefined();
  });

  it('returns static paths and CDN URLs as-is', () => {
    expect(resolvePreviewImageUrl('/_component-screenshots/hero.png')).toBe(
      '/_component-screenshots/hero.png'
    );
    expect(resolvePreviewImageUrl('https://cdn.example.com/hero.png')).toBe(
      'https://cdn.example.com/hero.png'
    );
  });

  it('returns the url from an uploaded preview descriptor', () => {
    expect(
      resolvePreviewImageUrl({
        url: '/uploads/hero_preview_abc123.png',
        hash: 'hero_preview_abc123',
        provider: 'local',
      })
    ).toBe('/uploads/hero_preview_abc123.png');
  });
});
