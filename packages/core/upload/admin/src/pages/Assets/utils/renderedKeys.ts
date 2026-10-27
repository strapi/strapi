import { assetKey, folderKey, type ItemKey } from './selection';

import type { MixedItem } from './mergeMixedList';
import type { File } from '../../../../../shared/contracts/files';
import type { Folder } from '../../../../../shared/contracts/folders';

/**
 * The keys of the items actually on screen, in render order.
 *
 * Single source for every consumer of the rendered set — range selection,
 * select-all and the bulk action bar. Derived once so they cannot disagree:
 * in "Folders: Mixed with files" the rows come from `mergeMixedList`, which
 * withholds folders sorting after the last loaded asset, so `folders` is not
 * the rendered folder set.
 */
export const buildRenderedKeys = ({
  folders,
  assets,
  mixedItems,
}: {
  folders: Folder[];
  assets: File[];
  /** The interleaved rows, when the table is in mixed mode. */
  mixedItems?: MixedItem[] | null;
}): ItemKey[] =>
  // Read-only items cannot be selected, so select-all and ranges skip them
  mixedItems
    ? mixedItems
        .filter((item) => !(item.kind === 'folder' ? item.folder : item.asset).readOnly)
        .map((item) =>
          item.kind === 'folder' ? folderKey(item.folder.id) : assetKey(item.asset.id)
        )
    : [
        ...folders.filter((folder) => !folder.readOnly).map((folder) => folderKey(folder.id)),
        ...assets.filter((asset) => !asset.readOnly).map((asset) => assetKey(asset.id)),
      ];
