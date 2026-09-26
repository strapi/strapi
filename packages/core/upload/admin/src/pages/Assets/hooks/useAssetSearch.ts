import { useCallback } from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';

import { encodeSearchQuery } from '../../../utils/searchQueryParam';

/**
 * Reads and writes the global asset search term held in `?_q=`.
 *
 * Debouncing is the input component's job (see `AssetsSearchInput`) — this hook
 * is a thin URL accessor so every consumer reads the same source of truth.
 */
export const useAssetSearch = () => {
  const [{ query }, setQuery] = useQueryParams<{ _q?: string }>();

  const searchQuery = query?._q ?? '';

  const setSearchQuery = useCallback(
    (value: string) => {
      if (value) {
        setQuery({ _q: encodeSearchQuery(value) }, 'push', true);
      } else {
        setQuery({ _q: '' }, 'remove', true);
      }
    },
    [setQuery]
  );

  const clearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);

  return {
    searchQuery,
    isSearching: searchQuery !== '',
    setSearchQuery,
    clearSearch,
  };
};
