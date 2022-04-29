import React, { useState } from 'react'; // useState
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import {
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  NoPermissions,
  AnErrorOccurred,
  SearchURLQuery,
  useSelectionState,
  useQueryParams,
} from '@strapi/helper-plugin';
import { Layout, HeaderLayout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Plus from '@strapi/icons/Plus';
import { Link } from '@strapi/design-system/Link';
import { Box } from '@strapi/design-system/Box';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Stack } from '@strapi/design-system/Stack';
import { UploadAssetDialog } from '../../components/UploadAssetDialog/UploadAssetDialog';
import { EditAssetDialog } from '../../components/EditAssetDialog';
import { AssetList } from '../../components/AssetList';
import { FolderList } from '../../components/FolderList';
import SortPicker from '../../components/SortPicker';
import { useAssets } from '../../hooks/useAssets';
import { useFolders } from '../../hooks/useFolders';
import { getTrad } from '../../utils';
import { Filters } from './components/Filters';
import { PaginationFooter } from '../../components/PaginationFooter';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { BulkDeleteButton } from './components/BulkDeleteButton';
import { EmptyAssets } from '../../components/EmptyAssets';

const BoxWithHeight = styled(Box)`
  height: ${32 / 16}rem;
  display: flex;
  align-items: center;
`;

export const MediaLibrary = () => {
  const {
    canRead,
    canCreate,
    canUpdate,
    canCopyLink,
    canDownload,
    isLoading: permissionsLoading,
  } = useMediaLibraryPermissions();
  const [{ query }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();

  const isFiltering = Boolean(query._q || query.filters);

  const { data: assetsData, isLoading: assetsLoading, error: assetsError } = useAssets({
    skipWhen: !canRead,
  });

  const { data: foldersData, isLoading: foldersLoading, errors: foldersError } = useFolders({
    enabled: assetsData?.pagination?.page === 1 && !isFiltering,
  });

  const handleChangeSort = value => {
    setQuery({ sort: value });
  };

  const [showUploadAssetDialog, setShowUploadAssetDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const [selected, { selectOne, selectAll }] = useSelectionState(['type', 'id'], []);
  const toggleUploadAssetDialog = () => setShowUploadAssetDialog(prev => !prev);

  useFocusWhenNavigate();

  const folders = foldersData?.results;
  const folderCount = folders?.length || 0;

  const assets = assetsData?.results;
  const assetCount = assetsData?.pagination?.total || 0;

  const isNestedFolder = !!query?.filters?.folder;
  const isLoading = foldersLoading || permissionsLoading || assetsLoading;

  return (
    <Layout>
      <Main aria-busy={isLoading}>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('plugin.name'),
            defaultMessage: 'Media Library',
          })}
          subtitle={formatMessage(
            {
              id: getTrad('header.content.assets'),
              defaultMessage:
                '{numberFolders, plural, one {1 folder} other {# folders}} - {numberAssets, plural, one {1 asset} other {# assets}}',
            },
            { numberAssets: assetCount, numberFolders: folderCount }
          )}
          navigationAction={
            isNestedFolder && (
              <Link startIcon={<ArrowLeft />} to="/plugins/upload/">
                {formatMessage({
                  id: getTrad('header.actions.folder-level-up'),
                  defaultMessage: 'Back',
                })}
              </Link>
            )
          }
          primaryAction={
            canCreate && (
              <Button startIcon={<Plus />} onClick={toggleUploadAssetDialog}>
                {formatMessage({
                  id: getTrad('header.actions.add-assets'),
                  defaultMessage: 'Add new assets',
                })}
              </Button>
            )
          }
        />

        <ActionLayout
          startActions={
            <>
              {canUpdate && (
                <BoxWithHeight
                  paddingLeft={2}
                  paddingRight={2}
                  background="neutral0"
                  hasRadius
                  borderColor="neutral200"
                >
                  <BaseCheckbox
                    aria-label={formatMessage({
                      id: getTrad('bulk.select.label'),
                      defaultMessage: 'Select all folders & assets',
                    })}
                    indeterminate={
                      selected?.length > 0 && selected?.length !== assetCount + folderCount
                    }
                    value={
                      (assetCount > 0 || folderCount > 0) &&
                      selected.length === assetCount + folderCount
                    }
                    onChange={() => selectAll([assets, folders])}
                  />
                </BoxWithHeight>
              )}
              {canRead && <SortPicker onChangeSort={handleChangeSort} />}
              {canRead && <Filters />}
            </>
          }
          endActions={
            <SearchURLQuery
              label={formatMessage({
                id: getTrad('search.label'),
                defaultMessage: 'Search for an asset',
              })}
            />
          }
        />

        <ContentLayout>
          {selected.length > 0 && <BulkDeleteButton selected={selected} onSuccess={selectAll} />}

          {isLoading && <LoadingIndicatorPage />}

          {(assetsError || foldersError) && <AnErrorOccurred />}

          {!canRead && <NoPermissions />}

          {canRead && (
            <Stack spacing={8}>
              {folders?.length > 0 && !isFiltering && (
                <FolderList
                  folders={folders}
                  /* TODO */
                  onEditFolder={() => {}}
                  onSelectFolder={selectOne}
                  selectedFolders={selected.filter(({ type }) => type === 'folder')}
                  title={formatMessage({
                    id: getTrad('list.folders.title'),
                    defaultMessage: 'Folders',
                  })}
                />
              )}

              {assetCount > 0 ? (
                <>
                  <AssetList
                    assets={assets}
                    onEditAsset={setAssetToEdit}
                    onSelectAsset={selectOne}
                    selectedAssets={selected.filter(({ type }) => type === 'asset')}
                    title={
                      !isFiltering &&
                      assetsData?.pagination?.page === 1 &&
                      formatMessage({
                        id: getTrad('list.assets.title'),
                        defaultMessage: 'Assets',
                      })
                    }
                  />

                  {assetsData?.pagination && (
                    <PaginationFooter pagination={assetsData.pagination} />
                  )}
                </>
              ) : (
                <EmptyAssets
                  action={
                    canCreate &&
                    !isFiltering && (
                      <Button
                        variant="secondary"
                        startIcon={<Plus />}
                        onClick={toggleUploadAssetDialog}
                      >
                        {formatMessage({
                          id: getTrad('header.actions.add-assets'),
                          defaultMessage: 'Add new assets',
                        })}
                      </Button>
                    )
                  }
                  content={
                    // eslint-disable-next-line no-nested-ternary
                    isFiltering
                      ? formatMessage({
                          id: getTrad('list.assets-empty.title-withSearch'),
                          defaultMessage: 'There are no assets with the applied filters',
                        })
                      : canCreate
                      ? formatMessage({
                          id: getTrad('list.assets.empty'),
                          defaultMessage: 'Upload your first assets...',
                        })
                      : formatMessage({
                          id: getTrad('list.assets.empty.no-permissions'),
                          defaultMessage: 'The asset list is empty',
                        })
                  }
                />
              )}
            </Stack>
          )}
        </ContentLayout>
      </Main>

      {showUploadAssetDialog && (
        <UploadAssetDialog onClose={toggleUploadAssetDialog} trackedLocation="upload" />
      )}

      {assetToEdit && (
        <EditAssetDialog
          onClose={() => setAssetToEdit(undefined)}
          asset={assetToEdit}
          canUpdate={canUpdate}
          canCopyLink={canCopyLink}
          canDownload={canDownload}
          trackedLocation="upload"
        />
      )}
    </Layout>
  );
};
