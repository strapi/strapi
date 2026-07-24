import { useQueryParams } from '@strapi/admin/strapi-admin';

/**
 * Sort state for the assets list, backed by URL query params so the current
 * ordering is shareable and survives Back/refresh:
 *
 * - `?sort=<rule>` — a single whitelisted rule. Omitted → default (most
 *   recent updates).
 * - `?folders=mixed` — folders interleaved with files. Omitted → folders on top.
 *
 * The "Sort by" and "Sort direction" groups are mutually exclusive: exactly one
 * rule is active at a time (one checkmark total, like the design mock). Picking
 * an option in one group clears the other; clearing the active option falls
 * back to the default — an unsorted list is not a state the UI offers.
 */

export const SORT_BY_RULES = {
  oldestUploads: 'createdAt:ASC',
  mostRecentUpdates: 'updatedAt:DESC',
} as const;

export const SORT_DIRECTION_RULES = {
  nameAsc: 'name:ASC',
  nameDesc: 'name:DESC',
  sizeAsc: 'size:ASC',
  sizeDesc: 'size:DESC',
} as const;

export type SortByKey = keyof typeof SORT_BY_RULES;
export type SortDirectionKey = keyof typeof SORT_DIRECTION_RULES;
export type FoldersPosition = 'top' | 'mixed';

const DEFAULT_SORT_BY: SortByKey = 'mostRecentUpdates';

const SORT_BY_BY_RULE = Object.fromEntries(
  Object.entries(SORT_BY_RULES).map(([key, rule]) => [rule, key])
) as Record<string, SortByKey>;

const SORT_DIRECTION_BY_RULE = Object.fromEntries(
  Object.entries(SORT_DIRECTION_RULES).map(([key, rule]) => [rule, key])
) as Record<string, SortDirectionKey>;

interface ParsedSort {
  sortBy: SortByKey | null;
  direction: SortDirectionKey | null;
}

/** Parses `?sort=` — the first recognized rule wins, unknown rules are dropped. */
const parseSortParam = (raw: string | undefined): ParsedSort => {
  for (const rule of (raw ?? '').split(',')) {
    if (rule in SORT_BY_BY_RULE) {
      return { sortBy: SORT_BY_BY_RULE[rule], direction: null };
    }
    if (rule in SORT_DIRECTION_BY_RULE) {
      return { sortBy: null, direction: SORT_DIRECTION_BY_RULE[rule] };
    }
  }

  return { sortBy: DEFAULT_SORT_BY, direction: null };
};

const serializeSort = (sortBy: SortByKey | null, direction: SortDirectionKey | null): string => {
  const rules: (string | null)[] = [
    sortBy && SORT_BY_RULES[sortBy],
    direction && SORT_DIRECTION_RULES[direction],
  ];

  return rules.filter((rule): rule is string => Boolean(rule)).join(',');
};

export interface ListSort {
  sortBy: SortByKey | null;
  direction: SortDirectionKey | null;
  foldersPosition: FoldersPosition;
  /** Combined rules for the files query, e.g. `updatedAt:DESC,name:ASC`. */
  assetsSort: string;
  /**
   * Rules applicable to the folders query — folders have no `size` column, so
   * size rules are dropped; with nothing left, folders keep their default
   * alphabetical order (matches the sidebar tree).
   */
  foldersSort: string;
  setSortBy: (key: SortByKey | null) => void;
  setDirection: (key: SortDirectionKey | null) => void;
  setFoldersPosition: (position: FoldersPosition) => void;
}

export const useListSort = (): ListSort => {
  const [{ query }, setQuery] = useQueryParams<{ sort?: string; folders?: string }>();

  const { sortBy, direction } = parseSortParam(query?.sort);
  const foldersPosition: FoldersPosition = query?.folders === 'mixed' ? 'mixed' : 'top';

  const writeSort = (nextSortBy: SortByKey | null, nextDirection: SortDirectionKey | null) => {
    // Exactly one active rule: clearing the active one falls back to default.
    if (nextSortBy === null && nextDirection === null) {
      nextSortBy = DEFAULT_SORT_BY;
    }

    const serialized = serializeSort(nextSortBy, nextDirection);

    if (nextSortBy === DEFAULT_SORT_BY && nextDirection === null) {
      setQuery({ sort: '' }, 'remove');
    } else {
      setQuery({ sort: serialized });
    }
  };

  // Groups are mutually exclusive — picking in one clears the other.
  const setSortBy = (key: SortByKey | null) => writeSort(key, null);
  const setDirection = (key: SortDirectionKey | null) => writeSort(null, key);

  const setFoldersPosition = (position: FoldersPosition) => {
    if (position === 'mixed') {
      setQuery({ folders: 'mixed' });
    } else {
      setQuery({ folders: '' }, 'remove');
    }
  };

  const assetsSort = serializeSort(sortBy, direction);
  const folderRuleCandidates: (string | null)[] = [
    sortBy && SORT_BY_RULES[sortBy],
    direction && !direction.startsWith('size') ? SORT_DIRECTION_RULES[direction] : null,
  ];
  const folderRules = folderRuleCandidates.filter((rule): rule is string => Boolean(rule));
  const foldersSort = folderRules.length > 0 ? folderRules.join(',') : 'name:ASC';

  return {
    sortBy,
    direction,
    foldersPosition,
    assetsSort,
    foldersSort,
    setSortBy,
    setDirection,
    setFoldersPosition,
  };
};
