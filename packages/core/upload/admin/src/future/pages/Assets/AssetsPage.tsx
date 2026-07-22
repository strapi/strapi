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
import { ChevronDown, Files, Folder, GridFour as GridIcon, Link, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useUploadFromUrlsMutation, useUploadFilesMutation } from '../../services/api';
import { useGetFolderQuery, useGetFoldersQuery } from '../../services/folders';
import { getTranslationKey } from '../../utils/translations';

import {
  AssetDetailsDrawer,
  useAssetDetailsParam,
} from './components/AssetDetails/AssetDetailsDrawer';
import { AssetsGrid } from './components/AssetsGrid';
import { AssetsTable } from './components/AssetsTable';
import { BulkActionsBar } from './components/BulkActionsBar';
import { CreateFolderDialog } from './components/CreateFolderDialog';
import { AssetsDndProvider } from './components/Dnd/AssetsDndProvider';
import { DropFilesMessage, DropZoneWithOverlay } from './components/DropZone/UploadDropZone';
import { UploadDropZoneProvider } from './components/DropZone/UploadDropZoneContext';
import { EmptyState } from './components/EmptyState';
import { FolderTree } from './components/FolderTree/FolderTree';
import { ImportFromUrlDialog } from './components/ImportFromUrlDialog';
import { SortMenu } from './components/SortMenu';
import { localStorageKeys, viewOptions } from './constants';
import { AssetSelectionProvider, useAssetSelection } from './hooks/useAssetSelection';
import { useFolderInfo } from './hooks/useFolderInfo';
import { useFolderNavigation } from './hooks/useFolderNavigation';
import { useInfiniteAssets } from './hooks/useInfiniteAssets';
import { useListSort, type FoldersPosition } from './hooks/useListSort';
import { getListQueryKey } from './utils/listQueryKey';
import { mergeMixedList } from './utils/mergeMixedList';

import type { UploadFileInfo } from '../../../../../shared/contracts/files';

const INTERSECTION_OPTIONS: IntersectionObserverInit = { threshold: 0.1 };

/* -------------------------------------------------------------------------------------------------
 * AssetsView
 * -----------------------------------------------------------------------------------------------*/

interface AssetsViewProps {
  view: number;
  folderId: number | null;
  assetsSort: string;
  foldersSort: string;
  foldersPosition: FoldersPosition;
  onAssetItemClick: (assetId: number) => void;
  onAddAssets: () => void;
}

const AssetsView = ({
  view,
  folderId,
  assetsSort,
  foldersSort,
  foldersPosition,
  onAssetItemClick,
  onAddAssets,
}: AssetsViewProps) => {
  const { formatMessage } = useIntl();
  const {
    assets,
    isLoading: isLoadingAssets,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteAssets({ folder: folderId, sort: assetsSort });
  const { data: folders = [], isLoading: isLoadingFolders } = useGetFoldersQuery({
    parentId: folderId,
    sort: foldersSort,
  });

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
    return <EmptyState onAddAssets={onAddAssets} />;
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
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ClearSelectionOnChange
 *
 * Selection is list-scoped: it resets when the user is looking at a different list.
 * The list fingerprint is getListQueryKey() — folder, view, search, sort, filter.
 *
 * Hybrid rule: infinite scroll does not change the key (selection persists).
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
  const itemCountLabel = formatMessage(
    {
      id: getTranslationKey('header.content.item-count'),
      defaultMessage: '{count, plural, =1 {# item} other {# items}}',
    },
    { count: itemCount }
  );
  const pageHeaderTitle = title
    ? `${title} (${itemCountLabel})`
    : formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' });

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
      await uploadFiles({ formData, totalFiles: files.length }).unwrap();
    } catch (error) {
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
    await uploadFilesToFolder(files, currentFolderId);
  };

  const handleUrlUpload = async (urls: string[]) => {
    try {
      await uploadFromUrls({ urls, folderId: currentFolderId }).unwrap();
    } catch (error) {
      // Error is already dispatched to store from the API queryFn
    }
  };

  const listSort = useListSort();

  const listQueryKey = getListQueryKey({
    folderId: currentFolderId,
    view,
    search: '', // TODO: wire when building header search
    // Folder position changes the render order too — selection must reset.
    sort: `${listSort.assetsSort};folders=${listSort.foldersPosition}`,
    filter: null, // TODO: wire when building header filters
  });

  return (
    <>
      <UploadDropZoneProvider onDrop={handleDrop}>
        <AssetSelectionProvider>
          <AssetsDndProvider>
            <ClearSelectionOnChange listQueryKey={listQueryKey} />
            <Box ref={uploadDropZoneRef}>
              <Layouts.Root
                minHeight="100vh"
                background="neutral0"
                sideNav={
                  <FolderTree
                    currentFolderId={currentFolderId}
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
                          startIcon={<Folder />}
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
                    }
                    subtitle={
                      <Flex justifyContent="space-between" alignItems="center" gap={4} width="100%">
                        <Flex gap={4} alignItems="center">
                          TODO: Filters and search
                        </Flex>

                        <Flex gap={4} alignItems="stretch">
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
                    }
                  />
                </HeaderWrapper>

                <Layouts.Content>
                  <DropZoneWithOverlay>
                    <DropFilesMessage uploadDropZoneRef={uploadDropZoneRef} folderName={title} />
                    <AssetsView
                      view={view}
                      folderId={currentFolderId}
                      assetsSort={listSort.assetsSort}
                      foldersSort={listSort.foldersSort}
                      foldersPosition={listSort.foldersPosition}
                      onAssetItemClick={openDetails}
                      onAddAssets={handleFileSelect}
                    />
                  </DropZoneWithOverlay>
                </Layouts.Content>
              </Layouts.Root>
            </Box>
            <BulkActionsBar />
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
