import { useEffect, useMemo } from 'react';

import { useGetFolderQuery, useGetFoldersQuery } from '../../../services/folders';
import { buildAssetFilters } from '../utils/buildAssetFilters';

import { useAssetSearch } from './useAssetSearch';
import { useFolderNavigation } from './useFolderNavigation';
import { useInfiniteAssets } from './useInfiniteAssets';
import { useListFilters } from './useListFilters';
import { useListSort } from './useListSort';

/**
 * The list behind the Media Library page and the Content Manager asset picker:
 * the current folder, search, sort and filters, and the folders and assets they
 * select. Where that query state lives (URL or memory) is decided by
 * `ListQueryStateProvider`, not here.
 */
export const useAssetsList = () => {
  const folderNavigation = useFolderNavigation();
  const { currentFolderId, navigateToRoot } = folderNavigation;

  // Deleted or missing folders (404) need a fetch — handled here, not in
  // `useFolderNavigation` (which only strips malformed ?folder= values).
  const { currentData: currentFolder, error: currentFolderError } = useGetFolderQuery(
    { id: currentFolderId! },
    { skip: currentFolderId === null }
  );

  useEffect(() => {
    if (currentFolderError?.name === 'NotFoundError') {
      navigateToRoot();
    }
  }, [currentFolderError, navigateToRoot]);

  const assetSearch = useAssetSearch();
  const { searchQuery, isSearching } = assetSearch;

  const canSearchAll = isSearching && currentFolderId !== null;
  const isSearchingAll = canSearchAll && assetSearch.isSearchingAll;
  const isSearchScopedToFolder = canSearchAll && !isSearchingAll;
  const searchFolderPath = isSearchScopedToFolder ? currentFolder?.path : undefined;
  // Without the folder's path yet, the search would run library-wide.
  const isWaitingForSearchScope = isSearchScopedToFolder && !searchFolderPath;
  // A failed folder request would otherwise leave the list waiting forever.
  const searchScopeError = isWaitingForSearchScope ? currentFolderError : undefined;
  const isLoadingSearchScope = isWaitingForSearchScope && !searchScopeError;
  const listSort = useListSort();
  const listFilters = useListFilters();

  // Resolve relative presets against "now" only when the filters change —
  // keeps the query args (and RTK cache keys) stable between renders.
  const builtFilters = useMemo(
    () => buildAssetFilters(listFilters.filters, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serialized is the value identity of filters
    [listFilters.serialized]
  );

  const {
    assets,
    subscribers,
    pagination,
    isLoading: isLoadingAssets,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    error: assetsError,
  } = useInfiniteAssets({
    // The real folder is passed even while searching: the service swaps the
    // folder filter for `searchFolderPath` when `search` is set. List filters
    // compose with both modes.
    folder: currentFolderId,
    search: searchQuery || undefined,
    searchFolderPath,
    sort: listSort.assetsSort,
    filters: builtFilters.fileClauses,
    enabled: builtFilters.showFiles && !isWaitingForSearchScope,
  });

  const { data: fetchedFolders = [], isLoading: isLoadingFolders } = useGetFoldersQuery(
    {
      parentId: currentFolderId,
      search: searchQuery || undefined,
      searchFolderPath,
      sort: listSort.foldersSort,
      filters: builtFilters.folderClauses,
    },
    { skip: !builtFilters.showFolders || isWaitingForSearchScope }
  );
  // A type badge can exclude folders structurally (e.g. "Type is Picture").
  const folders = useMemo(
    () => (builtFilters.showFolders ? fetchedFolders : []),
    [builtFilters.showFolders, fetchedFolders]
  );

  return {
    ...folderNavigation,
    ...assetSearch,
    canSearchAll,
    isSearchingAll,
    listSort,
    listFilters,
    assets,
    subscribers,
    pagination,
    isLoadingAssets: isLoadingAssets || isLoadingSearchScope,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    assetsError: assetsError ?? searchScopeError,
    folders,
    isLoadingFolders: isLoadingFolders || isLoadingSearchScope,
  };
};
