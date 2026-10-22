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
  const { error: currentFolderError } = useGetFolderQuery(
    { id: currentFolderId! },
    { skip: currentFolderId === null }
  );

  useEffect(() => {
    if (currentFolderError?.name === 'NotFoundError') {
      navigateToRoot();
    }
  }, [currentFolderError, navigateToRoot]);

  const assetSearch = useAssetSearch();
  const { searchQuery } = assetSearch;
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
    // The real folder is passed even while searching: the service drops the folder
    // filter when `search` is set, so results are still global. List filters
    // compose with both modes.
    folder: currentFolderId,
    search: searchQuery || undefined,
    sort: listSort.assetsSort,
    filters: builtFilters.fileClauses,
    enabled: builtFilters.showFiles,
  });

  const { data: fetchedFolders = [], isLoading: isLoadingFolders } = useGetFoldersQuery(
    {
      parentId: currentFolderId,
      search: searchQuery || undefined,
      sort: listSort.foldersSort,
      filters: builtFilters.folderClauses,
    },
    { skip: !builtFilters.showFolders }
  );
  // A type badge can exclude folders structurally (e.g. "Type is Picture").
  const folders = useMemo(
    () => (builtFilters.showFolders ? fetchedFolders : []),
    [builtFilters.showFolders, fetchedFolders]
  );

  return {
    ...folderNavigation,
    ...assetSearch,
    listSort,
    listFilters,
    assets,
    subscribers,
    pagination,
    isLoadingAssets,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    assetsError,
    folders,
    isLoadingFolders,
  };
};
