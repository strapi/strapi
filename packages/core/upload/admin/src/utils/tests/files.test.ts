import { getAssetSubtitle, getAssetSubtitleParts } from '../files';

describe('getAssetSubtitle', () => {
  it('shows the type, dimensions and size of an image', () => {
    expect(getAssetSubtitle({ ext: '.png', width: 2500, height: 3209, size: 2300 })).toBe(
      'PNG - 2500×3209 - 2.3MB'
    );
  });

  it('shows the type and size of an asset without dimensions', () => {
    expect(getAssetSubtitle({ ext: '.pdf', width: null, height: null, size: 120 })).toBe(
      'PDF - 120.0KB'
    );
  });

  it('skips the dimensions when only one of them is known', () => {
    expect(getAssetSubtitle({ ext: '.mp4', width: 1920, height: null, size: 1500 })).toBe(
      'MP4 - 1.5MB'
    );
  });

  it('skips missing parts without leaving empty separators', () => {
    expect(getAssetSubtitle({ width: 800, height: 600, size: 42 })).toBe('800×600 - 42.0KB');
    expect(getAssetSubtitle({ ext: '.txt' })).toBe('TXT');
    expect(getAssetSubtitle({ ext: '', size: 0 })).toBe('');
  });

  it('returns an empty string when nothing is known', () => {
    expect(getAssetSubtitle({})).toBe('');
  });
});

describe('getAssetSubtitleParts', () => {
  it('lists the known parts in order', () => {
    expect(getAssetSubtitleParts({ ext: '.png', width: 2500, height: 3209, size: 2300 })).toEqual([
      'PNG',
      '2500×3209',
      '2.3MB',
    ]);
  });

  it('returns no parts when nothing is known', () => {
    expect(getAssetSubtitleParts({})).toEqual([]);
  });
});
