import { mergeMixedList } from '../mergeMixedList';
import { buildRenderedKeys } from '../renderedKeys';

import type { File } from '../../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../../shared/contracts/folders';

const folder = (id: number, name: string, updatedAt: string) =>
  ({ id, name, updatedAt }) as unknown as Folder;

const asset = (id: number, name: string, updatedAt: string) =>
  ({ id, name, updatedAt }) as unknown as File;

describe('buildRenderedKeys', () => {
  const folders = [
    folder(1, 'alpha', '2024-05-01T00:00:00.000Z'),
    folder(2, 'beta', '2024-01-01T00:00:00.000Z'),
  ];
  const assets = [
    asset(10, 'a.png', '2024-04-01T00:00:00.000Z'),
    asset(11, 'b.png', '2024-03-01T00:00:00.000Z'),
  ];

  it('puts folders before assets when the rows are not interleaved', () => {
    expect(buildRenderedKeys({ folders, assets })).toEqual([
      'folder:1',
      'folder:2',
      'asset:10',
      'asset:11',
    ]);
  });

  it('follows the interleaved order in mixed mode', () => {
    const mixedItems = mergeMixedList({
      folders,
      assets,
      sort: 'updatedAt:DESC',
      hasNextPage: false,
    });

    expect(buildRenderedKeys({ folders, assets, mixedItems })).toEqual([
      'folder:1',
      'asset:10',
      'asset:11',
      'folder:2',
    ]);
  });

  it('leaves out folders the mixed list is still withholding', () => {
    // With pages left to load, `mergeMixedList` only places folders that sort at
    // or before the last loaded asset — the rest belong further down the list
    // and are not on screen. Selecting them would act on rows the user cannot
    // see, and folder deletes cascade.
    const mixedItems = mergeMixedList({
      folders,
      assets,
      sort: 'updatedAt:DESC',
      hasNextPage: true,
    });

    const keys = buildRenderedKeys({ folders, assets, mixedItems });

    expect(keys).toEqual(['folder:1', 'asset:10', 'asset:11']);
    expect(keys).not.toContain('folder:2');
  });

  it('treats an empty mixed list as no rendered rows', () => {
    expect(buildRenderedKeys({ folders, assets, mixedItems: [] })).toEqual([]);
  });
});
