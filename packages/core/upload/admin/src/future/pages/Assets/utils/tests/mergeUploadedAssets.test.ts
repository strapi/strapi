import { getAssetComparator, mergeUploadedAssets } from '../mergeUploadedAssets';

import type { File } from '../../../../../../../shared/contracts/files';

const asset = (id: number, overrides: Partial<File> = {}): File => ({
  id,
  name: `asset-${id}.png`,
  hash: `hash_${id}`,
  ext: '.png',
  mime: 'image/png',
  size: id,
  url: `http://example.com/asset-${id}.png`,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const names = (assets: File[]) => assets.map(({ name }) => name);

describe('getAssetComparator', () => {
  it('orders newest first for the default rule', () => {
    const older = asset(1, { updatedAt: '2024-01-01T00:00:00.000Z' });
    const newer = asset(2, { updatedAt: '2024-06-01T00:00:00.000Z' });

    expect([older, newer].sort(getAssetComparator('updatedAt:DESC'))).toEqual([newer, older]);
  });

  it('orders oldest first for an ascending date rule', () => {
    const older = asset(1, { createdAt: '2024-01-01T00:00:00.000Z' });
    const newer = asset(2, { createdAt: '2024-06-01T00:00:00.000Z' });

    expect([newer, older].sort(getAssetComparator('createdAt:ASC'))).toEqual([older, newer]);
  });

  it('orders by name and by size', () => {
    const a = asset(1, { name: 'apple.png', size: 900 });
    const b = asset(2, { name: 'banana.png', size: 100 });

    expect(names([b, a].sort(getAssetComparator('name:ASC')))).toEqual(['apple.png', 'banana.png']);
    expect(names([a, b].sort(getAssetComparator('name:DESC')))).toEqual([
      'banana.png',
      'apple.png',
    ]);
    expect(names([a, b].sort(getAssetComparator('size:ASC')))).toEqual(['banana.png', 'apple.png']);
    expect(names([b, a].sort(getAssetComparator('size:DESC')))).toEqual([
      'apple.png',
      'banana.png',
    ]);
  });

  it('breaks ties on id so the order is total', () => {
    const first = asset(1);
    const second = asset(2);

    // Same timestamp on both: without a tie-break the comparator returns 0 and
    // the pair could swap between renders.
    expect(getAssetComparator('updatedAt:DESC')(first, second)).toBeGreaterThan(0);
    expect(getAssetComparator('createdAt:ASC')(first, second)).toBeLessThan(0);
  });

  it('falls back to newest-first when the rule is missing or unknown', () => {
    const older = asset(1, { updatedAt: '2024-01-01T00:00:00.000Z' });
    const newer = asset(2, { updatedAt: '2024-06-01T00:00:00.000Z' });

    expect([older, newer].sort(getAssetComparator())).toEqual([newer, older]);
    expect([older, newer].sort(getAssetComparator('bogus:ASC'))).toEqual([newer, older]);
  });
});

describe('mergeUploadedAssets', () => {
  const loaded = [
    asset(3, { name: 'c.png', updatedAt: '2024-03-01T00:00:00.000Z' }),
    asset(2, { name: 'b.png', updatedAt: '2024-02-01T00:00:00.000Z' }),
    asset(1, { name: 'a.png', updatedAt: '2024-01-01T00:00:00.000Z' }),
  ];

  it('places an upload at its sort position, not at the end', () => {
    const fresh = asset(9, { name: 'fresh.png', updatedAt: '2024-02-15T00:00:00.000Z' });

    const merged = mergeUploadedAssets({
      assets: loaded,
      uploaded: [fresh],
      sort: 'updatedAt:DESC',
      hasNextPage: false,
    });

    expect(names(merged)).toEqual(['c.png', 'fresh.png', 'b.png', 'a.png']);
  });

  it('places the newest upload at the top under the default sort', () => {
    const fresh = asset(9, { name: 'fresh.png', updatedAt: '2024-12-01T00:00:00.000Z' });

    const merged = mergeUploadedAssets({
      assets: loaded,
      uploaded: [fresh],
      sort: 'updatedAt:DESC',
      hasNextPage: true,
    });

    expect(names(merged)).toEqual(['fresh.png', 'c.png', 'b.png', 'a.png']);
  });

  it('keeps the server copy once the list has caught up', () => {
    const server = asset(2, { name: 'b-renamed.png', updatedAt: '2024-02-01T00:00:00.000Z' });
    const stale = asset(2, { name: 'b.png', updatedAt: '2024-02-01T00:00:00.000Z' });

    const merged = mergeUploadedAssets({
      assets: [server],
      uploaded: [stale],
      sort: 'updatedAt:DESC',
      hasNextPage: false,
    });

    expect(names(merged)).toEqual(['b-renamed.png']);
  });

  it('drops an upload that sorts past the loaded tail while pages remain', () => {
    const fresh = asset(9, { name: 'fresh.png', updatedAt: '2020-01-01T00:00:00.000Z' });

    const merged = mergeUploadedAssets({
      assets: loaded,
      uploaded: [fresh],
      sort: 'updatedAt:DESC',
      hasNextPage: true,
    });

    // Its real place is on a page the user has not loaded, so showing it right
    // after the last loaded item would put it in the wrong position.
    expect(names(merged)).toEqual(['c.png', 'b.png', 'a.png']);
  });

  it('appends that same upload once the whole list is loaded', () => {
    const fresh = asset(9, { name: 'fresh.png', updatedAt: '2020-01-01T00:00:00.000Z' });

    const merged = mergeUploadedAssets({
      assets: loaded,
      uploaded: [fresh],
      sort: 'updatedAt:DESC',
      hasNextPage: false,
    });

    expect(names(merged)).toEqual(['c.png', 'b.png', 'a.png', 'fresh.png']);
  });

  it('places several uploads in order, in one pass', () => {
    const merged = mergeUploadedAssets({
      assets: loaded,
      uploaded: [
        asset(8, { name: 'oldest-fresh.png', updatedAt: '2024-01-15T00:00:00.000Z' }),
        asset(9, { name: 'newest-fresh.png', updatedAt: '2024-12-01T00:00:00.000Z' }),
      ],
      sort: 'updatedAt:DESC',
      hasNextPage: false,
    });

    expect(names(merged)).toEqual([
      'newest-fresh.png',
      'c.png',
      'b.png',
      'oldest-fresh.png',
      'a.png',
    ]);
  });

  it('respects a non-default sort', () => {
    const fresh = asset(9, { name: 'bb.png' });

    const merged = mergeUploadedAssets({
      assets: [
        asset(1, { name: 'a.png' }),
        asset(2, { name: 'b.png' }),
        asset(3, { name: 'c.png' }),
      ],
      uploaded: [fresh],
      sort: 'name:ASC',
      hasNextPage: false,
    });

    expect(names(merged)).toEqual(['a.png', 'b.png', 'bb.png', 'c.png']);
  });

  it('returns the original list untouched when there is nothing to place', () => {
    expect(
      mergeUploadedAssets({
        assets: loaded,
        uploaded: [],
        sort: 'updatedAt:DESC',
        hasNextPage: false,
      })
    ).toBe(loaded);

    expect(
      mergeUploadedAssets({
        assets: loaded,
        uploaded: [loaded[1]],
        sort: 'updatedAt:DESC',
        hasNextPage: false,
      })
    ).toBe(loaded);
  });
});
