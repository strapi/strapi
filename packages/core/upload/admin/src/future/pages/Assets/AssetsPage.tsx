import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import {
  Layouts,
  SearchInput,
  useNotification,
  useAPIErrorHandler,
} from '@strapi/admin/strapi-admin';
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

import { usePersistentState } from '../../../hooks/usePersistentState';
import { useUploadFilesMutation } from '../../services/api';
import { useGetAssetsQuery } from '../../services/assets';
import { getTranslationKey } from '../../utils/translations';

import { AssetsGrid } from './components/AssetsGrid';
import { AssetsList } from './components/AssetsList';
import { localStorageKeys, viewOptions } from './constants';

interface AssetsViewProps {
  view: number;
}

const AssetsView = ({ view }: AssetsViewProps) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetAssetsQuery({ folder: null });

  const isGridView = view === viewOptions.GRID;
  const assets = data?.results ?? [];

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

  if (isGridView) {
    return <AssetsGrid assets={assets} />;
  }

  return <AssetsList assets={assets} />;
};

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
    background: ${({ theme }) => theme.colors.neutral100};
  }

  &[data-state='on'] {
    background: ${({ theme }) => theme.colors.neutral150};
  }

  svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

/**
 * Dropzone items
 */

const setOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

const DropZoneOverlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => setOpacity(theme.colors.primary200, 0.3)};
  border: 1px solid ${({ theme }) => theme.colors.primary700};
  border-radius: ${({ theme }) => theme.borderRadius};
  z-index: 1;
  pointer-events: none;
`;

const DropFilesMessage = styled(Box)<{ $leftContentWidth: number }>`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[8]};
  left: 50%;
  transform: translateX(calc(-50% + ${({ $leftContentWidth }) => $leftContentWidth / 2}px));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spaces[2]};
  background: ${({ theme }) => theme.colors.primary600};
  padding: ${({ theme }) => theme.spaces[4]} ${({ theme }) => theme.spaces[6]};
  border-radius: ${({ theme }) => theme.borderRadius};
  z-index: 2;
`;

export const AssetsPage = () => {
  const { formatMessage } = useIntl();

  // Upload hooks
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError } = useAPIErrorHandler();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFiles] = useUploadFilesMutation();

  // View state
  const [view, setView] = usePersistentState(localStorageKeys.view, viewOptions.GRID);
  const isGridView = view === viewOptions.GRID;

  // Dropzone state (covers main content area)
  const [leftContentWidth, setLeftContentWidth] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Calculate the left content width to position the dropzone message correctly
  useEffect(() => {
    const mainContent = document.querySelector('[data-strapi-main-content]');
    if (!mainContent) return;

    const updateRect = () => {
      const rect = mainContent.getBoundingClientRect();
      setLeftContentWidth((prev) => (prev !== rect.left ? rect.left : prev));
    };

    updateRect();
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(mainContent);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const handleDragEnd = () => setIsDraggingOver(false);
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

  /**
   * Handle drag and drop events (for uploading files)
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.relatedTarget || e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const { files } = e.dataTransfer;
    if (files?.length) {
      handleDrop(Array.from(files));
    }
  };

  // Upload handlers
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const uploadFilesToFolder = async (files: globalThis.File[], folderId: number | null) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
      formData.append(
        'fileInfo',
        JSON.stringify({
          name: file.name,
          caption: null,
          alternativeText: null,
          folder: folderId,
        })
      );
    });
    try {
      await uploadFiles(formData).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslationKey('assets.uploaded'),
            defaultMessage:
              '{number, plural, one {# asset} other {# assets}} uploaded successfully',
          },
          { number: files.length }
        ),
      });
    } catch (error) {
      const errorMessage = _unstableFormatAPIError(error as Error);
      toggleNotification({
        type: 'danger',
        message: errorMessage,
      });
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFilesToFolder(Array.from(files), null);
    }
    e.target.value = '';
  };

  const handleDrop = async (files: globalThis.File[]) => {
    await uploadFilesToFolder(files, null);
  };

  return (
    <Layouts.Root
      minHeight="100vh"
      ref={dropZoneRef}
      data-testid="assets-dropzone"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDropEvent}
    >
      <VisuallyHidden>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple />
      </VisuallyHidden>

      {isDraggingOver && (
        <DropFilesMessage $leftContentWidth={leftContentWidth}>
          <Typography textColor="neutral0">
            {formatMessage({
              id: getTranslationKey('dropzone.upload.message'),
              defaultMessage: 'Drop here to upload to',
            })}
          </Typography>
          <Flex gap={2} alignItems="center">
            <Folder width={20} height={20} fill="neutral0" />
            <Typography textColor="neutral0" fontWeight="semiBold">
              Current folder
            </Typography>
          </Flex>
        </DropFilesMessage>
      )}
      <Layouts.Header
        navigationAction={<Box>TODO: Breadcrumbs</Box>}
        title="TODO: Folder location"
        primaryAction={
          <Flex gap={2}>
            <SimpleMenu
              popoverPlacement="bottom-end"
              variant="default"
              endIcon={<ChevronDown />}
              label={formatMessage({ id: getTranslationKey('new'), defaultMessage: 'New' })}
            >
              <MenuItem onSelect={handleFileSelect} startIcon={<Files />}>
                {formatMessage({
                  id: getTranslationKey('import-files'),
                  defaultMessage: 'Import files',
                })}
              </MenuItem>
            </SimpleMenu>
            <SearchInput
              label={formatMessage({
                id: getTranslationKey('search.label'),
                defaultMessage: 'Search for an asset',
              })}
              trackedEvent="didSearchMediaLibraryElements"
              trackedEventDetails={{ location: 'upload' }}
            />
            <StyledToggleGroup
              type="single"
              value={isGridView ? 'grid' : 'list'}
              onValueChange={(value) =>
                value && setView(value === 'grid' ? viewOptions.GRID : viewOptions.LIST)
              }
              aria-label={formatMessage({
                id: getTranslationKey('view.switch.label'),
                defaultMessage: 'View options',
              })}
            >
              <StyledToggleItem
                value="list"
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
        }
      />

      <Layouts.Content>
        <Box position="relative">
          {isDraggingOver && <DropZoneOverlay />}
          <AssetsView view={view} />
        </Box>
      </Layouts.Content>
    </Layouts.Root>
  );
};
