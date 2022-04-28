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
import Plus from '@strapi/icons/Plus';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { UploadAssetDialog } from '../../components/UploadAssetDialog/UploadAssetDialog';
import { EditFolderDialog } from '../../components/EditFolderDialog';
import { EditAssetDialog } from '../../components/EditAssetDialog';
import { AssetList } from '../../components/AssetList';
import SortPicker from '../../components/SortPicker';
import { useAssets } from '../../hooks/useAssets';
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
    isLoading: isLoadingPermissions,
  } = useMediaLibraryPermissions();
  const [{ query }, setQuery] = useQueryParams();

  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useAssets({
    skipWhen: !canRead,
  });

  const handleChangeSort = value => {
    setQuery({ sort: value });
  };

  const [showUploadAssetDialog, setShowUploadAssetDialog] = useState(false);
  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const [selected, { selectOne, selectAll }] = useSelectionState('id', []);
  const toggleUploadAssetDialog = () => setShowUploadAssetDialog(prev => !prev);
  const toggleEditFolderDialog = () => setShowEditFolderDialog(prev => !prev);

  useFocusWhenNavigate();

  const loading = isLoadingPermissions || isLoading;
  const assets = data?.results;
  const assetCount = data?.pagination?.total || 0;
  const folderCount = 0;
  const isFiltering = Boolean(query._q || query.filters);

  return (
    <Layout>
      <Main aria-busy={loading}>
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
          primaryAction={
            <Stack horizontal spacing={2}>
              <Button startIcon={<Plus />} variant="secondary" onClick={toggleEditFolderDialog}>
                {formatMessage({
                  id: getTrad('header.actions.add-folder'),
                  defaultMessage: 'Add new folder',
                })}
              </Button>

              {canCreate && (
                <Button startIcon={<Plus />} onClick={toggleUploadAssetDialog}>
                  {formatMessage({
                    id: getTrad('header.actions.add-assets'),
                    defaultMessage: 'Add new assets',
                  })}
                </Button>
              )}
            </Stack>
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
                      defaultMessage: 'Select all assets',
                    })}
                    indeterminate={
                      assets?.length > 0 &&
                      selected.length > 0 &&
                      selected.length !== assets?.length
                    }
                    value={assets?.length > 0 && selected.length === assets?.length}
                    onChange={() => selectAll(assets)}
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
          {selected.length > 0 && (
            <BulkDeleteButton selectedAssets={selected} onSuccess={selectAll} />
          )}

          {loading && <LoadingIndicatorPage />}
          {error && <AnErrorOccurred />}
          {!canRead && <NoPermissions />}
          {canRead && assets && assets.length === 0 && (
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
          {canRead && assets && assets.length > 0 && (
            <>
              <AssetList
                assets={assets}
                onEditAsset={setAssetToEdit}
                onSelectAsset={selectOne}
                selectedAssets={selected}
              />
              {data?.pagination && <PaginationFooter pagination={data.pagination} />}
            </>
          )}
        </ContentLayout>
      </Main>

      {showUploadAssetDialog && (
        <UploadAssetDialog onClose={toggleUploadAssetDialog} trackedLocation="upload" />
      )}

      {/* TODO: After the folder was created successfully, we need to set the current page to 1 */}
      {showEditFolderDialog && <EditFolderDialog onClose={toggleEditFolderDialog} />}

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
