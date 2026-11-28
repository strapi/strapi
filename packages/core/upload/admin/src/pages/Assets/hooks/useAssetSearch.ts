import { useCallback } from 'react';

import { encodeSearchQuery } from '../../../utils/searchQueryParam';

import { useListQueryParams } from './useListQueryParams';

/**
 * Reads and writes the asset search term held in `?_q=`, and the "Search all
 * media" switch held in `?searchAll=`.
 *
 * Debouncing is the input component's job (see `AssetsSearchInput`) — this hook
 * is a thin URL accessor so every consumer reads the same source of truth.
 */
export const useAssetSearch = () => {
  const [{ query }, setQuery] = useListQueryParams<{ _q?: string; searchAll?: string }>();

  const searchQuery = query?._q ?? '';
  const isSearchingAll = query?.searchAll === 'true';

  const setSearchQuery = useCallback(
    (value: string) => {
      if (value) {
        setQuery({ _q: encodeSearchQuery(value) }, 'push', true);
      } else {
        setQuery({ _q: '', searchAll: '' }, 'remove', true);
      }
    },
    [setQuery]
  );

  const setSearchingAll = useCallback(
    (value: boolean) => {
      if (value) {
        setQuery({ searchAll: 'true' }, 'push', true);
      } else {
        setQuery({ searchAll: '' }, 'remove', true);
      }
    },
    [setQuery]
  );

  const clearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);

  return {
    searchQuery,
    isSearching: searchQuery !== '',
    isSearchingAll,
    setSearchQuery,
    setSearchingAll,
    clearSearch,
  };
};
