import { buildComparator, mergeMixedList } from '../mergeMixedList';

import type { File } from '../../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../../shared/contracts/folders';

const folder = (id: number, name: string, updatedAt: string): Folder =>
  ({ id, name, updatedAt, createdAt: updatedAt, pathId: id, path: `/${id}` }) as Folder;

const asset = (id: number, name: string, updatedAt: string, size = 10): File =>
  ({ id, name, updatedAt, createdAt: updatedAt, size, hash: `h${id}` }) as File;

const names = (items: ReturnType<typeof mergeMixedList>) =>
  items.map((item) => (item.kind === 'folder' ? `d:${item.folder.name}` : `f:${item.asset.name}`));

describe('buildComparator', () => {
  it('applies rules in order with per-rule direction', () => {
    const compare = buildComparator('updatedAt:DESC,name:ASC');
    const a = { name: 'a', updatedAt: '2026-01-02T00:00:00Z' };
    const b = { name: 'b', updatedAt: '2026-01-01T00:00:00Z' };
    const c = { name: 'c', updatedAt: '2026-01-01T00:00:00Z' };

    expect(compare(a, b)).toBeLessThan(0); // newer first
    expect(compare(b, c)).toBeLessThan(0); // tie on date → name asc
  });

  it('treats missing size as 0', () => {
    const compare = buildComparator('size:ASC');
    expect(compare({ name: 'folder' }, { name: 'file', size: 5 })).toBeLessThan(0);
  });
});

describe('mergeMixedList', () => {
  const folders = [
    folder(1, 'beta', '2026-01-03T00:00:00Z'),
    folder(2, 'zed', '2026-01-01T00:00:00Z'),
  ];
  const assets = [
    asset(10, 'alpha', '2026-01-04T00:00:00Z'),
    asset(11, 'gamma', '2026-01-02T00:00:00Z'),
  ];

  it('interleaves folders into the asset stream by sort key (folders first on ties)', () => {
    const items = mergeMixedList({
      folders,
      assets,
      sort: 'updatedAt:DESC',
      hasNextPage: false,
    });

    expect(names(items)).toEqual(['f:alpha', 'd:beta', 'f:gamma', 'd:zed']);
  });

  it('defers folders that might belong after not-yet-loaded assets', () => {
    const items = mergeMixedList({
      folders,
      assets: [assets[0]], // only the newest asset loaded, more pages pending
      sort: 'updatedAt:DESC',
      hasNextPage: true,
    });

    // beta (Jan 3) sorts after alpha (Jan 4) — but unseen assets may come
    // between them, so nothing after the last loaded asset is placed yet.
    expect(names(items)).toEqual(['f:alpha']);
  });

  it('releases deferred folders once the last page is loaded', () => {
    const items = mergeMixedList({
      folders,
      assets,
      sort: 'updatedAt:DESC',
      hasNextPage: true,
    });

    // gamma (Jan 2) is the last loaded asset: beta (Jan 3) can be placed,
    // zed (Jan 1) sorts after it and stays deferred.
    expect(names(items)).toEqual(['f:alpha', 'd:beta', 'f:gamma']);
  });

  it('renders nothing while the first asset page is still pending', () => {
    expect(
      mergeMixedList({ folders, assets: [], sort: 'updatedAt:DESC', hasNextPage: true })
    ).toEqual([]);
  });

  it('renders all folders when there are simply no assets', () => {
    const items = mergeMixedList({ folders, assets: [], sort: 'name:ASC', hasNextPage: false });
    expect(names(items)).toEqual(['d:beta', 'd:zed']);
  });

  it('sinks folders to the end for descending size sorts (folder size = 0)', () => {
    const items = mergeMixedList({
      folders,
      assets,
      sort: 'size:DESC',
      hasNextPage: false,
    });

    expect(names(items).slice(-2)).toEqual(['d:beta', 'd:zed']);
  });
});
