import { useRef, type ChangeEvent } from 'react';

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
import { ChevronDown, Files, GridFour as GridIcon, List } from '@strapi/icons';
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

  // Upload handlers
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      const filesArray = Array.from(files);

      // Add files and fileInfo to the form data
      filesArray.forEach((file) => {
        formData.append('files', file);
        formData.append(
          'fileInfo',
          JSON.stringify({
            name: file.name,
            caption: null,
            alternativeText: null,
            folder: null,
          })
        );
      });

      try {
        // unwrap() is needed to throw errors and trigger the catch block
        // Without it, RTK Query never rejects and catch would never execute
        await uploadFiles(formData).unwrap();
        toggleNotification({
          type: 'success',
          message: formatMessage(
            {
              id: getTranslationKey('assets.uploaded'),
              defaultMessage:
                '{number, plural, one {# asset} other {# assets}} uploaded successfully',
            },
            { number: filesArray.length }
          ),
        });
      } catch (error) {
        // Format the error message using the API error handler to provide
        // context-specific feedback (e.g., file size limits, format restrictions, network errors)
        const errorMessage = _unstableFormatAPIError(error as Error);
        toggleNotification({
          type: 'danger',
          message: errorMessage,
        });
      }
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <Layouts.Root>
      <VisuallyHidden>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple />
      </VisuallyHidden>

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
                {formatMessage({ id: getTranslationKey('view.grid'), defaultMessage: 'Grid view' })}
              </StyledToggleItem>
            </StyledToggleGroup>
          </Flex>
        }
      />

      <Layouts.Content>
        <AssetsView view={view} />
      </Layouts.Content>
    </Layouts.Root>
  );
};
