import { useRef, useCallback, useMemo, useState, useEffect, type ChangeEvent } from 'react';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Layouts, useElementOnScreen, usePersistentState } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  Loader,
  MenuItem,
  SimpleMenu,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import {
  ChevronDown,
  Files,
  Folder as FolderIcon,
  GridFour as GridIcon,
  Link,
  List,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useAIAvailability } from '../../../hooks/useAiAvailability';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useUploadFromUrlsMutation, useUploadFilesMutation } from '../../services/api';
import { useGetFolderQuery, useGetFoldersQuery } from '../../services/folders';
import { useGetUploadSettingsQuery } from '../../services/settings';
import { buildItemLocations, type ItemLocations } from '../../utils/itemLocations';
import { getTranslationKey } from '../../utils/translations';

import {
  AssetDetailsDrawer,
  useAssetDetailsParam,
} from './components/AssetDetails/AssetDetailsDrawer';
import { AssetsGrid } from './components/AssetsGrid';
import { AssetsSearchInput } from './components/AssetsSearchInput';
import { AssetsTable } from './components/AssetsTable';
import { BulkActionsBar } from './components/BulkActionsBar';
import { CreateFolderDialog } from './components/CreateFolderDialog';
import { AssetsDndProvider } from './components/Dnd/AssetsDndProvider';
import { DropFilesMessage, DropZoneWithOverlay } from './components/DropZone/UploadDropZone';
import { UploadDropZoneProvider } from './components/DropZone/UploadDropZoneContext';
import { EmptyState, FilteredEmptyState } from './components/EmptyState';
import { FilterBadges } from './components/FilterBadges';
import { FilterMenu } from './components/FilterMenu';
import { FolderTree } from './components/FolderTree/FolderTree';
import { ImportFromUrlDialog } from './components/ImportFromUrlDialog';
import { SortMenu } from './components/SortMenu';
import { localStorageKeys, viewOptions } from './constants';
import { useAssetSearch } from './hooks/useAssetSearch';
import { AssetSelectionProvider, useAssetSelection } from './hooks/useAssetSelection';
import { useFolderInfo } from './hooks/useFolderInfo';
import { useFolderNavigation } from './hooks/useFolderNavigation';
import { useInfiniteAssets } from './hooks/useInfiniteAssets';
import { useListFilters } from './hooks/useListFilters';
import { useListSort, type FoldersPosition } from './hooks/useListSort';
import { buildAssetFilters } from './utils/buildAssetFilters';
import { getListQueryKey } from './utils/listQueryKey';
import { mergeMixedList } from './utils/mergeMixedList';

import type { File, UploadFileInfo } from '../../../../../shared/contracts/files';
import type { Folder } from '../../../../../shared/contracts/folders';

const INTERSECTION_OPTIONS: IntersectionObserverInit = { threshold: 0.1 };

const ITEM_COUNT_MESSAGE = {
  id: getTranslationKey('header.content.item-count'),
  defaultMessage: '{count, plural, =1 {# item} other {# items}}',
};

const SEARCH_RESULTS_COUNT_MESSAGES = {
  both: {
    id: getTranslationKey('header.search-results.count'),
    defaultMessage:
      '{numberFolders, plural, one {1 folder} other {# folders}} - {numberAssets, plural, one {1 asset} other {# assets}}',
  },
  folders: {
    id: getTranslationKey('header.search-results.count.folders'),
    defaultMessage: '{numberFolders, plural, one {1 folder} other {# folders}}',
  },
  assets: {
    id: getTranslationKey('header.search-results.count.assets'),
    defaultMessage: '{numberAssets, plural, =0 {0 assets} one {1 asset} other {# assets}}',
  },
};

const getSearchResultsCountMessage = (numberFolders: number, numberAssets: number) => {
  if (numberFolders === 0) {
    return SEARCH_RESULTS_COUNT_MESSAGES.assets;
  }

  if (numberAssets === 0) {
    return SEARCH_RESULTS_COUNT_MESSAGES.folders;
  }

  return SEARCH_RESULTS_COUNT_MESSAGES.both;
};

/* -------------------------------------------------------------------------------------------------
 * AssetsView
 * -----------------------------------------------------------------------------------------------*/

interface AssetsViewProps {
  view: number;
  folders: Folder[];
  isLoadingFolders: boolean;
  assets: File[];
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

const AssetsView = ({
  view,
  folders,
  isLoadingFolders,
  assets,
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

  const loadMoreRef = useElementOnScreen<HTMLDivElement>(
    useCallback(
      (isVisible) => {
        if (isVisible && hasNextPage && !isFetchingMore) {
          fetchNextPage();
        }
      },
      [hasNextPage, isFetchingMore, fetchNextPage]
    ),
    INTERSECTION_OPTIONS
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
      {isGridView ? (
        <AssetsGrid folders={folders} assets={assets} onAssetItemClick={onAssetItemClick} />
      ) : (
        <AssetsTable
          assets={assets}
          folders={folders}
          mixedItems={mixedItems}
          onAssetItemClick={onAssetItemClick}
        />
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
      <BulkActionsBar assets={assets} locations={locations} />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ClearSelectionOnChange
 *
 * Selection is list-scoped: it resets when the user is looking at a different list.
 * The list fingerprint is getListQueryKey() — folder, search, sort, filter.
 *
 * Hybrid rule: infinite scroll does not change the key (selection persists), and
 * neither does the table/grid toggle — both views render the same list.
 * Search/sort/filter changes do (selection clears) — same mental model as folder nav.
 * -----------------------------------------------------------------------------------------------*/

interface ClearSelectionOnChangeProps {
  listQueryKey: string;
}

const ClearSelectionOnChange = ({ listQueryKey }: ClearSelectionOnChangeProps) => {
  const { clear } = useAssetSelection();

  useEffect(() => {
    clear();
  }, [listQueryKey, clear]);

  return null;
};

/* -------------------------------------------------------------------------------------------------
 * AssetsPage
 * -----------------------------------------------------------------------------------------------*/

/**
 * Mirrors the design-system Toggle look (grey track, white active segment
 * card) — reproduced locally because the DS component is a labels-only
 * boolean input (no icons) and paints its left segment in danger red. Here
 * both segments use the primary blue when active.
 */
const StyledToggleGroup = styled(ToggleGroup.Root)`
  display: flex;
  padding: ${({ theme }) => theme.spaces[1]};
  background: ${({ theme }) => theme.colors.neutral100};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const StyledToggleItem = styled(ToggleGroup.Item)`
  display: flex;
  flex: 1 1 50%;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: 0.6rem ${({ theme }) => theme.spaces[3]};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: transparent;
  color: ${({ theme }) => theme.colors.neutral600};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes[1]};
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.neutral700};
  }

  &[data-state='on'] {
    background: ${({ theme }) => theme.colors.neutral0};
    border-color: ${({ theme }) => theme.colors.neutral200};
    color: ${({ theme }) => theme.colors.primary600};
  }

  svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

const HeaderWrapper = styled(Box)`
  [data-strapi-header] {
    background: ${({ theme }) => theme.colors.neutral0};

    h1 {
      font-size: 1.8rem;
    }
  }
`;

export const AssetsPage = () => {
  const { formatMessage } = useIntl();
  const { openDetails } = useAssetDetailsParam();
  const { canCreate, canUpdate } = useMediaLibraryPermissions();

  const { currentFolderId, navigateToFolderId, navigateToRoot } = useFolderNavigation();
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
  const { title, itemCount } = useFolderInfo(currentFolderId);

  const { searchQuery, isSearching, clearSearch } = useAssetSearch();
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
    subscribers: assetPageSubscribers,
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

  // Both move affordances (drag and the bulk bar) resolve each item's parent
  // from the rows on screen — while searching, results are global and the
  // folder currently open says nothing about where an item lives.
  const itemLocations = useMemo(() => buildItemLocations(assets, folders), [assets, folders]);

  const itemCountLabel = formatMessage(ITEM_COUNT_MESSAGE, { count: itemCount });

  const searchResultsTitle = formatMessage(
    {
      id: getTranslationKey('header.search-results'),
      defaultMessage: 'Search results for "{query}"',
    },
    { query: searchQuery }
  );
  const numberFolders = folders.length;
  const numberAssets = pagination?.total ?? 0;

  const searchResultsCountLabel = formatMessage(
    getSearchResultsCountMessage(numberFolders, numberAssets),
    { numberFolders, numberAssets }
  );

  let pageHeaderTitle: string;
  if (isSearching) {
    pageHeaderTitle = `${searchResultsTitle} (${searchResultsCountLabel})`;
  } else if (title) {
    pageHeaderTitle = `${title} (${itemCountLabel})`;
  } else {
    pageHeaderTitle = formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' });
  }

  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);

  // View state
  const [view, setView] = usePersistentState(localStorageKeys.view, viewOptions.GRID);
  const isGridView = view === viewOptions.GRID;

  // Dialog state
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDropZoneRef = useRef<HTMLDivElement>(null);

  // Upload handlers
  const [uploadFiles] = useUploadFilesMutation();
  const [uploadFromUrls] = useUploadFromUrlsMutation();
  // `concurrentUploadRequests` echoes the app config. Missing settings (still
  // loading, no permission) fall back to sequential — never faster than the
  // server asked for.
  const { data: settings } = useGetUploadSettingsQuery();
  const concurrency = settings?.data?.concurrentUploadRequests ?? 1;
  // Drives the post-upload AI metadata phase shown per row in the progress dialog.
  const { isEnabled: isAiMetadataEnabled } = useAIAvailability();

  const uploadFilesToFolder = async (files: globalThis.File[], folderId: number | null) => {
    if (files.length === 0) return;

    const formData = new FormData();
    const fileInfoArray: UploadFileInfo[] = [];

    files.forEach((file) => {
      formData.append('files', file);
      fileInfoArray.push({
        name: file.name,
        caption: null,
        alternativeText: null,
        folder: folderId,
      });
    });

    formData.append('fileInfo', JSON.stringify(fileInfoArray));
    try {
      await uploadFiles({
        formData,
        totalFiles: files.length,
        concurrency,
        generateAiMetadata: Boolean(isAiMetadataEnabled),
      }).unwrap();
    } catch {
      // Error is already dispatched to store from the API queryFn
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFilesToFolder(Array.from(files), currentFolderId);
    }
    e.target.value = '';
  };

  const handleDrop = async (files: globalThis.File[]) => {
    // Defence in depth: the provider is `disabled` without `assets.create`
    // (so onDrop won't fire), but guard here too in case it's ever wired live.
    if (!canCreate) return;
    await uploadFilesToFolder(files, currentFolderId);
  };

  const handleUrlUpload = async (urls: string[]) => {
    try {
      await uploadFromUrls({
        urls,
        folderId: currentFolderId,
        generateAiMetadata: Boolean(isAiMetadataEnabled),
      }).unwrap();
    } catch {
      // Error is already dispatched to store from the API queryFn
    }
  };

  // The view is deliberately absent: table and grid render the same list, so
  // toggling views keeps the selection.
  const listQueryKey = getListQueryKey({
    folderId: currentFolderId,
    search: searchQuery,
    // Folder position changes the render order too — selection must reset.
    sort: `${listSort.assetsSort};folders=${listSort.foldersPosition}`,
    filter: listFilters.serialized || null,
  });

  return (
    <>
      <UploadDropZoneProvider onDrop={handleDrop} disabled={!canCreate}>
        <AssetSelectionProvider disabled={!canUpdate}>
          <AssetsDndProvider locations={itemLocations}>
            <ClearSelectionOnChange listQueryKey={listQueryKey} />
            <Box ref={uploadDropZoneRef}>
              <Layouts.Root
                minHeight="100vh"
                background="neutral0"
                sideNav={
                  <FolderTree
                    currentFolderId={currentFolderId}
                    showActiveFolder={!isSearching}
                    onSelectFolder={navigateToFolderId}
                  />
                }
              >
                <VisuallyHidden>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple />
                </VisuallyHidden>

                <HeaderWrapper>
                  <Layouts.Header
                    title={pageHeaderTitle}
                    primaryAction={
                      canCreate && (
                        <SimpleMenu
                          popoverPlacement="bottom-end"
                          variant="default"
                          endIcon={<ChevronDown />}
                          label={formatMessage({
                            id: getTranslationKey('new'),
                            defaultMessage: 'New',
                          })}
                        >
                          <MenuItem
                            onSelect={() => setIsCreateFolderDialogOpen(true)}
                            startIcon={<FolderIcon />}
                          >
                            {formatMessage({
                              id: getTranslationKey('folder.create.title'),
                              defaultMessage: 'New folder',
                            })}
                          </MenuItem>
                          <MenuItem onSelect={handleFileSelect} startIcon={<Files />}>
                            {formatMessage({
                              id: getTranslationKey('import-files'),
                              defaultMessage: 'Import files',
                            })}
                          </MenuItem>
                          <MenuItem onSelect={() => setIsUrlDialogOpen(true)} startIcon={<Link />}>
                            {formatMessage({
                              id: getTranslationKey('import-from-url'),
                              defaultMessage: 'Import from URL',
                            })}
                          </MenuItem>
                        </SimpleMenu>
                      )
                    }
                    subtitle={
                      <>
                        <Flex
                          justifyContent="space-between"
                          alignItems="center"
                          gap={4}
                          width="100%"
                        >
                          <Flex gap={4} alignItems="center">
                            <FilterMenu listFilters={listFilters} />
                            <AssetsSearchInput />
                          </Flex>

                          <Flex gap={4} alignItems="center">
                            <SortMenu sort={listSort} showFoldersGroup={!isGridView} />
                            <StyledToggleGroup
                              type="single"
                              value={isGridView ? 'grid' : 'table'}
                              onValueChange={(value) =>
                                value &&
                                setView(value === 'grid' ? viewOptions.GRID : viewOptions.TABLE)
                              }
                              aria-label={formatMessage({
                                id: getTranslationKey('view.switch.label'),
                                defaultMessage: 'View options',
                              })}
                            >
                              <StyledToggleItem
                                value="table"
                                aria-label={formatMessage({
                                  id: getTranslationKey('view.table'),
                                  defaultMessage: 'Table view',
                                })}
                              >
                                <List />
                                {formatMessage({
                                  id: getTranslationKey('view.table'),
                                  defaultMessage: 'Table view',
                                })}
                              </StyledToggleItem>
                              <StyledToggleItem
                                value="grid"
                                aria-label={formatMessage({
                                  id: getTranslationKey('view.grid'),
                                  defaultMessage: 'Grid view',
                                })}
                              >
                                <GridIcon />
                                {formatMessage({
                                  id: getTranslationKey('view.grid'),
                                  defaultMessage: 'Grid view',
                                })}
                              </StyledToggleItem>
                            </StyledToggleGroup>
                          </Flex>
                        </Flex>
                        <FilterBadges listFilters={listFilters} />
                      </>
                    }
                  />
                </HeaderWrapper>

                <Layouts.Content>
                  {/* Renders nothing — keeps every loaded page's query subscribed
                      so a rename/delete refreshes the whole list. */}
                  {assetPageSubscribers}
                  <DropZoneWithOverlay>
                    <DropFilesMessage uploadDropZoneRef={uploadDropZoneRef} folderName={title} />
                    <AssetsView
                      view={view}
                      folders={folders}
                      isLoadingFolders={isLoadingFolders}
                      assets={assets}
                      isLoadingAssets={isLoadingAssets}
                      isFetchingMore={isFetchingMore}
                      hasNextPage={hasNextPage}
                      fetchNextPage={fetchNextPage}
                      error={assetsError}
                      locations={itemLocations}
                      searchQuery={searchQuery}
                      assetsSort={listSort.assetsSort}
                      foldersPosition={listSort.foldersPosition}
                      hasActiveFilters={listFilters.filters.length > 0}
                      onClearFilters={listFilters.clearFilters}
                      onAssetItemClick={openDetails}
                      onAddAssets={handleFileSelect}
                      canAddAssets={canCreate}
                      onClearSearch={clearSearch}
                    />
                  </DropZoneWithOverlay>
                </Layouts.Content>
              </Layouts.Root>
            </Box>
          </AssetsDndProvider>
        </AssetSelectionProvider>
      </UploadDropZoneProvider>
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        folderName={title}
        parentFolderId={currentFolderId}
        onClose={() => setIsCreateFolderDialogOpen(false)}
      />
      <ImportFromUrlDialog
        open={isUrlDialogOpen}
        onClose={() => setIsUrlDialogOpen(false)}
        onUpload={handleUrlUpload}
      />
      <AssetDetailsDrawer />
    </>
  );
};
