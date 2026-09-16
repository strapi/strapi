/**
 * Merges just-uploaded assets into the loaded asset list so each one appears as
 * soon as its own upload finishes, rather than when the whole batch settles.
 *
 * The upload is one mutation per batch, so its cache invalidation fires once at
 * the end. These helpers bridge that gap purely client-side: the completed
 * uploads already sit in the progress store as full `File` objects, so they can
 * be placed into the list at their sort position with no extra request.
 *
 * The server list stays authoritative — merging never reorders it, and an id it
 * already contains wins over the local copy, so the end-of-batch refetch
 * silently takes over.
 */

import type { File } from '../../../../../../shared/contracts/files';

type SortField = 'createdAt' | 'updatedAt' | 'name' | 'size';

const SORT_FIELDS: SortField[] = ['createdAt', 'updatedAt', 'name', 'size'];

const isSortField = (value: string): value is SortField =>
  (SORT_FIELDS as string[]).includes(value);

const DEFAULT_RULE = 'updatedAt:DESC';

const compareByField = (field: SortField, a: File, b: File): number => {
  if (field === 'size') {
    return (a.size ?? 0) - (b.size ?? 0);
  }

  if (field === 'name') {
    return a.name.localeCompare(b.name);
  }

  // `createdAt` / `updatedAt` are ISO-8601, which sorts correctly as text.
  return (a[field] ?? '').localeCompare(b[field] ?? '');
};

/**
 * Comparator matching a `<field>:<ASC|DESC>` sort rule, as sent to the API.
 *
 * Ties break on id so the order is total: without it, two files sharing a
 * timestamp could swap places between renders.
 */
export const getAssetComparator = (rule: string = DEFAULT_RULE) => {
  const [field, requestedDirection] = rule.split(':');
  // An unrecognised field discards the direction too: half-applying a rule we
  // cannot read would order the list differently from the default it stands in for.
  const isKnownField = isSortField(field);
  const sortField: SortField = isKnownField ? field : 'updatedAt';
  const direction = isKnownField ? requestedDirection : 'DESC';
  const sign = direction === 'ASC' ? 1 : -1;

  return (a: File, b: File): number => {
    const byField = compareByField(sortField, a, b);

    return byField !== 0 ? sign * byField : sign * (a.id - b.id);
  };
};

/**
 * Places `uploaded` into `assets` at their sort position.
 *
 * An upload that sorts past everything loaded is dropped unless the list is
 * fully loaded: it belongs on a page the user has not reached, and appending it
 * would show it adjacent to the last loaded item instead of at its real place.
 */
export const mergeUploadedAssets = ({
  assets,
  uploaded,
  sort,
  hasNextPage,
}: {
  assets: File[];
  uploaded: File[];
  sort?: string;
  /** Whether more pages remain, i.e. the tail of the list is not loaded. */
  hasNextPage: boolean;
}): File[] => {
  if (uploaded.length === 0) {
    return assets;
  }

  const loadedIds = new Set(assets.map((asset) => asset.id));
  const compare = getAssetComparator(sort);
  const fresh = uploaded.filter((asset) => !loadedIds.has(asset.id)).sort(compare);

  if (fresh.length === 0) {
    return assets;
  }

  const merged = [...assets];

  for (const asset of fresh) {
    const at = merged.findIndex((loaded) => compare(asset, loaded) < 0);

    if (at === -1) {
      if (hasNextPage) {
        continue;
      }
      merged.push(asset);
    } else {
      merged.splice(at, 0, asset);
    }
  }

  return merged;
};
