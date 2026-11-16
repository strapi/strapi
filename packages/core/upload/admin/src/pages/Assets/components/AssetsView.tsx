import { useMemo } from 'react';

import { Box, Flex, Loader, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { type ItemLocations } from '../../../utils/itemLocations';
import { getTranslationKey } from '../../../utils/translations';
import { viewOptions } from '../constants';
import { useInfiniteScrollSentinel } from '../hooks/useInfiniteScrollSentinel';
import { useListSettings } from '../hooks/useListSettings';
import { type FoldersPosition } from '../hooks/useListSort';
import { mergeMixedList } from '../utils/mergeMixedList';
import { buildRenderedKeys } from '../utils/renderedKeys';

import { AssetsGrid } from './AssetsGrid';
import { AssetsTable } from './AssetsTable';
import { BulkActionsBar } from './BulkActionsBar';
import { EmptyState, FilteredEmptyState } from './EmptyState';
import { ItemContextMenuProvider } from './ItemContextMenu';

import type { File } from '../../../../../shared/contracts/files';
import type { Folder } from '../../../../../shared/contracts/folders';

// The negative bottom margin shrinks the trigger area by a pixel so the 1px
// sentinel sitting exactly at the fold (when a page's rows happen to fill the
// viewport) reads as "not visible" and doesn't pull an extra page. It still
// triggers as soon as the sentinel scrolls a hair into view. Tune the bottom
// value if the list over- or under-fetches near the fold.
const INTERSECTION_OPTIONS: IntersectionObserverInit = {
  threshold: 0,
  rootMargin: '0px 0px -1px 0px',
};

/* -------------------------------------------------------------------------------------------------
 * AssetsView
 * -----------------------------------------------------------------------------------------------*/

interface AssetsViewProps {
  view: number;
  folders: Folder[];
  isLoadingFolders: boolean;
  assets: File[];
  /** Total matching assets on the server, beyond the pages loaded so far. */
  assetsTotal?: number;
  isLoadingAssets: boolean;
  isFetchingMore: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: unknown;
  locations: ItemLocations;
  searchQuery: string;
  assetsSort: string;
  foldersPosition: FoldersPosition;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onAssetItemClick: (assetId: number) => void;
  onAddAssets: () => void;
  canAddAssets: boolean;
  onClearSearch: () => void;
}

export const AssetsView = ({
  view,
  folders,
  isLoadingFolders,
  assets,
  assetsTotal,
  isLoadingAssets,
  isFetchingMore,
  hasNextPage,
  fetchNextPage,
  error,
  locations,
  searchQuery,
  assetsSort,
  foldersPosition,
  hasActiveFilters,
  onClearFilters,
  onAssetItemClick,
  onAddAssets,
  canAddAssets,
  onClearSearch,
}: AssetsViewProps) => {
  const { formatMessage } = useIntl();
  const { showItemActions } = useListSettings();

  const isGridView = view === viewOptions.GRID;
  const isLoading = isLoadingAssets || isLoadingFolders;

  // "Folders: Mixed with files" — interleave the complete folder list into the
  // loaded asset stream client-side, following the active sort. Table view
  // only: the grid always keeps folders in their own band on top.
  const mixedItems = useMemo(
    () =>
      foldersPosition === 'mixed' && !isGridView
        ? mergeMixedList({ folders, assets, sort: assetsSort, hasNextPage })
        : null,
    [foldersPosition, isGridView, folders, assets, assetsSort, hasNextPage]
  );

  // Derived once here so the table, the grid and the bulk bar all agree on what
  // is on screen — in mixed mode that is not simply every folder.
  const renderedKeys = buildRenderedKeys({ folders, assets, mixedItems });

  const loadMoreRef = useInfiniteScrollSentinel({
    hasNextPage,
    isFetchingMore,
    onLoadMore: fetchNextPage,
    options: INTERSECTION_OPTIONS,
  });

  const list = isGridView ? (
    <AssetsGrid
      folders={folders}
      assets={assets}
      assetsTotal={assetsTotal}
      renderedKeys={renderedKeys}
      onAssetItemClick={onAssetItemClick}
    />
  ) : (
    <AssetsTable
      assets={assets}
      folders={folders}
      mixedItems={mixedItems}
      renderedKeys={renderedKeys}
      onAssetItemClick={onAssetItemClick}
    />
  );

  if (isLoading) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
      </Flex>
    );
  }

  if (error) {
    return (
      <Box padding={8}>
        <Typography textColor="danger600">
          {formatMessage({
            id: getTranslationKey('list.assets.error'),
            defaultMessage: 'An error occurred while fetching assets.',
          })}
        </Typography>
      </Box>
    );
  }

  if (folders.length === 0 && assets.length === 0) {
    // While searching, the search empty state wins (it names the query); a
    // filter-only dead end gets the filtered variant with its Clear action.
    return hasActiveFilters && !searchQuery ? (
      <FilteredEmptyState onClearFilters={onClearFilters} />
    ) : (
      <EmptyState
        onAddAssets={onAddAssets}
        canAddAssets={canAddAssets}
        searchQuery={searchQuery}
        onClearSearch={onClearSearch}
      />
    );
  }
  return (
    <>
      {showItemActions ? (
        // Above both views so one instance serves either, and so the selection
        // menu has the `locations` its move dialog validates against.
        <ItemContextMenuProvider locations={locations}>{list}</ItemContextMenuProvider>
      ) : (
        list
      )}
      <div ref={loadMoreRef} style={{ height: 1 }} />
      {isFetchingMore && (
        <Flex justifyContent="center" padding={4}>
          <Loader>
            {formatMessage({
              id: getTranslationKey('list.assets.loading-more'),
              defaultMessage: 'Loading more assets...',
            })}
          </Loader>
        </Flex>
      )}
      {/* Lives here rather than in `AssetsPage` so it can read the loaded
          assets: the AI metadata action needs their mime types to know what
          the provider can handle. `position: fixed` keeps it visually anchored
          regardless of where it sits in the tree. */}
      {showItemActions && (
        <BulkActionsBar assets={assets} renderedKeys={renderedKeys} locations={locations} />
      )}
    </>
  );
};
