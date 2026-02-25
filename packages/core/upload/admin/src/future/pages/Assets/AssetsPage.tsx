import { useRef, useState, useCallback, type ChangeEvent } from 'react';

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
import { ChevronDown, Files, Folder, GridFour as GridIcon, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useUploadFilesStreamMutation } from '../../services/api';
import { useGetFoldersQuery } from '../../services/folders';
import { getTranslationKey } from '../../utils/translations';

import {
  AssetDetailsDrawer,
  useAssetDetailsParam,
} from './components/AssetDetails/AssetDetailsDrawer';
import { AssetsGrid } from './components/AssetsGrid';
import { AssetsTable } from './components/AssetsTable';
import { CreateFolderDialog } from './components/CreateFolderDialog';
import { DropFilesMessage, DropZoneWithOverlay } from './components/DropZone/UploadDropZone';
import { UploadDropZoneProvider } from './components/DropZone/UploadDropZoneContext';
import { localStorageKeys, viewOptions } from './constants';
import { useFolderInfo } from './hooks/useFolderInfo';
import { useFolderNavigation } from './hooks/useFolderNavigation';
import { useInfiniteAssets } from './hooks/useInfiniteAssets';

import type { UploadFileInfo } from '../../../../../shared/contracts/files';

const INTERSECTION_OPTIONS: IntersectionObserverInit = { threshold: 0.1 };

/* -------------------------------------------------------------------------------------------------
 * AssetsView
 * -----------------------------------------------------------------------------------------------*/

interface AssetsViewProps {
  view: number;
  folderId: number | null;
  onAssetItemClick: (assetId: number) => void;
}

const AssetsView = ({ view, folderId, onAssetItemClick }: AssetsViewProps) => {
  const { formatMessage } = useIntl();
  const {
    assets,
    isLoading: isLoadingAssets,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteAssets({ folder: folderId });
  const { data: folders = [], isLoading: isLoadingFolders } = useGetFoldersQuery({
    parentId: folderId,
  });

  const isGridView = view === viewOptions.GRID;
  const isLoading = isLoadingAssets || isLoadingFolders;

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
    return (
      <Box padding={8}>
        <Typography textColor="neutral600">
          {formatMessage({
            id: 'app.components.EmptyStateLayout.content-document',
            defaultMessage: 'No content found',
          })}
        </Typography>
      </Box>
    );
  }
  return (
    <>
      {isGridView ? (
        <AssetsGrid folders={folders} assets={assets} onAssetItemClick={onAssetItemClick} />
      ) : (
        <AssetsTable assets={assets} folders={folders} onAssetItemClick={onAssetItemClick} />
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
 * AssetsPage
 * -----------------------------------------------------------------------------------------------*/

const StyledToggleGroup = styled(ToggleGroup.Root)`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;

const StyledToggleItem = styled(ToggleGroup.Item)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  border: none;
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes[1]};
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &[data-state='on'] {
    background: ${({ theme }) => theme.colors.neutral150};
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

  const { currentFolderId } = useFolderNavigation();
  const { title, itemCount } = useFolderInfo(currentFolderId);
  const itemCountLabel = formatMessage(
    {
      id: getTranslationKey('header.content.item-count'),
      defaultMessage: '{count, plural, =1 {# item} other {# items}}',
    },
    { count: itemCount }
  );

  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);

  // View state
  const [view, setView] = usePersistentState(localStorageKeys.view, viewOptions.GRID);
  const isGridView = view === viewOptions.GRID;

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDropZoneRef = useRef<HTMLDivElement>(null);

  // Upload handlers
  const [uploadFilesStream] = useUploadFilesStreamMutation();

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
      await uploadFilesStream({ formData, totalFiles: files.length }).unwrap();
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

  return (
    <>
      <UploadDropZoneProvider onDrop={handleDrop}>
        <Box ref={uploadDropZoneRef}>
          <Layouts.Root minHeight="100vh" background="neutral0">
            <VisuallyHidden>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple />
            </VisuallyHidden>

            <HeaderWrapper>
              <Layouts.Header
                title={`${title} (${itemCountLabel})`}
                primaryAction={
                  <SimpleMenu
                    popoverPlacement="bottom-end"
                    variant="default"
                    endIcon={<ChevronDown />}
                    label={formatMessage({ id: getTranslationKey('new'), defaultMessage: 'New' })}
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
                  </SimpleMenu>
                }
                subtitle={
                  <Flex justifyContent="space-between" alignItems="center" gap={4} width="100%">
                    <Flex gap={4} alignItems="center">
                      TODO: Filters and search
                    </Flex>

                    <Flex gap={4} alignItems="center">
                      <Box>TODO: Sort</Box>
                      <StyledToggleGroup
                        type="single"
                        value={isGridView ? 'grid' : 'table'}
                        onValueChange={(value) =>
                          value && setView(value === 'grid' ? viewOptions.GRID : viewOptions.TABLE)
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
                <AssetsView view={view} folderId={currentFolderId} onAssetItemClick={openDetails} />
              </DropZoneWithOverlay>
            </Layouts.Content>
          </Layouts.Root>
        </Box>
      </UploadDropZoneProvider>
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        folderName={title}
        parentFolderId={currentFolderId}
        onClose={() => setIsCreateFolderDialogOpen(false)}
      />
      <AssetDetailsDrawer />
    </>
  );
};
