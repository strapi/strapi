import type { File } from '../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../shared/contracts/folders';

export type MixedItem = { kind: 'folder'; folder: Folder } | { kind: 'asset'; asset: File };

type SortableRecord = {
  name?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  size?: number | null;
};

const getComparableValue = (record: SortableRecord, field: string): number | string => {
  switch (field) {
    case 'createdAt':
    case 'updatedAt':
      return record[field] ? new Date(record[field]!).getTime() : 0;
    case 'size':
      // Folders have no size — they compare as 0 (start of ascending, end of descending).
      return record.size ?? 0;
    case 'name':
    default:
      return (record.name ?? '').toLowerCase();
  }
};

/**
 * Builds a comparator from comma-separated sort rules (`updatedAt:DESC,name:ASC`).
 * Rules apply in order; the first non-equal field decides. Client-side
 * approximation of the server ordering — good enough to slot folders between
 * files that were sorted server-side by the same rules.
 */
export const buildComparator = (sort: string) => {
  const rules = sort
    .split(',')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [field, direction] = rule.split(':');
      return { field, desc: direction?.toUpperCase() === 'DESC' };
    });

  return (a: SortableRecord, b: SortableRecord): number => {
    for (const { field, desc } of rules) {
      const va = getComparableValue(a, field);
      const vb = getComparableValue(b, field);

      let cmp: number;
      if (typeof va === 'string' || typeof vb === 'string') {
        cmp = String(va) < String(vb) ? -1 : String(va) > String(vb) ? 1 : 0;
      } else {
        cmp = va - vb;
      }

      if (cmp !== 0) {
        return desc ? -cmp : cmp;
      }
    }

    return 0;
  };
};

interface MergeMixedListParams {
  folders: Folder[];
  assets: File[];
  /** Combined sort rules used for the assets query. */
  sort: string;
  /**
   * More asset pages exist. A folder may only be placed once we know no
   * not-yet-loaded asset sorts before it — i.e. it compares ≤ the last loaded
   * asset. Later pages release the remaining folders progressively.
   */
  hasNextPage: boolean;
}

/**
 * Interleaves the complete folder list into the (possibly partially loaded)
 * asset stream according to the active sort. Ties order folders first.
 */
export const mergeMixedList = ({
  folders,
  assets,
  sort,
  hasNextPage,
}: MergeMixedListParams): MixedItem[] => {
  const compare = buildComparator(sort);

  const sortedFolders = [...folders].sort(compare);

  const lastAsset = assets[assets.length - 1];
  const placeableFolders =
    !hasNextPage || !lastAsset
      ? hasNextPage
        ? [] // nothing loaded yet — wait for the first page
        : sortedFolders
      : sortedFolders.filter((folder) => compare(folder, lastAsset) <= 0);

  const items: MixedItem[] = [];
  let folderIndex = 0;

  for (const asset of assets) {
    while (
      folderIndex < placeableFolders.length &&
      compare(placeableFolders[folderIndex], asset) <= 0
    ) {
      items.push({ kind: 'folder', folder: placeableFolders[folderIndex] });
      folderIndex += 1;
    }
    items.push({ kind: 'asset', asset });
  }

  while (folderIndex < placeableFolders.length) {
    items.push({ kind: 'folder', folder: placeableFolders[folderIndex] });
    folderIndex += 1;
  }

  return items;
};
