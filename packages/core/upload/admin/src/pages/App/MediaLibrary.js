import React, { useState } from 'react'; // useState
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import {
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  NoPermissions,
  NoMedia,
  AnErrorOccurred,
  SearchURLQuery,
} from '@strapi/helper-plugin';
import { Layout, HeaderLayout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import Plus from '@strapi/icons/Plus';
import { Box } from '@strapi/design-system/Box';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { UploadAssetDialog } from '../../components/UploadAssetDialog/UploadAssetDialog';
import { EditAssetDialog } from '../../components/EditAssetDialog';
import { ListView } from './components/ListView';
import { useAssets } from '../../hooks/useAssets';
import { getTrad } from '../../utils';
import { Filters } from './components/Filters';
import { SortPicker } from './components/SortPicker';
import { PaginationFooter } from '../../components/PaginationFooter';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { BulkDeleteButton } from './components/BulkDeleteButton';

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

  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useAssets({
    skipWhen: !canRead,
  });

  const [showUploadAssetDialog, setShowUploadAssetDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const [selected, setSelected] = useState([]);
  const toggleUploadAssetDialog = () => setShowUploadAssetDialog(prev => !prev);

  useFocusWhenNavigate();

  const loading = isLoadingPermissions || isLoading;
  const assets = data?.results;
  const assetCount = data?.pagination?.total || 0;

  const selectAllAssets = () => {
    if (selected.length > 0) {
      setSelected([]);
    } else {
      setSelected((assets || []).map(({ id }) => id));
    }
  };

  const selectAsset = asset => {
    const index = selected.indexOf(asset.id);

    if (index > -1) {
      setSelected(prevSelected => [
        ...prevSelected.slice(0, index),
        ...prevSelected.slice(index + 1),
      ]);
    } else {
      setSelected(prevSelected => [...prevSelected, asset.id]);
    }
  };

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
              id: getTrad(
                assetCount > 0
                  ? 'header.content.assets-multiple'
                  : 'header.content.assets.assets-single'
              ),
              defaultMessage: '0 assets',
            },
            { number: assetCount }
          )}
          primaryAction={
            canCreate ? (
              <Button startIcon={<Plus />} onClick={toggleUploadAssetDialog}>
                {formatMessage({
                  id: getTrad('header.actions.upload-assets'),
                  defaultMessage: 'Upload assets',
                })}
              </Button>
            ) : (
              undefined
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
                      defaultMessage: 'Select all assets',
                    })}
                    value={assets?.length > 0 && selected.length === assets?.length}
                    onChange={selectAllAssets}
                  />
                </BoxWithHeight>
              )}
              {canRead && <SortPicker />}
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
            <BulkDeleteButton assetIds={selected} onSuccess={() => setSelected([])} />
          )}

          {loading && <LoadingIndicatorPage />}
          {error && <AnErrorOccurred />}
          {!canRead && <NoPermissions />}
          {canRead && assets && assets.length === 0 && (
            <NoMedia
              action={
                canCreate ? (
                  <Button
                    variant="secondary"
                    startIcon={<Plus />}
                    onClick={toggleUploadAssetDialog}
                  >
                    {formatMessage({
                      id: getTrad('modal.header.browse'),
                      defaultMessage: 'Upload assets',
                    })}
                  </Button>
                ) : (
                  undefined
                )
              }
              content={
                canCreate
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
              <ListView
                assets={assets}
                onEditAsset={setAssetToEdit}
                onSelectAsset={selectAsset}
                selectedAssets={selected}
              />
              {data?.pagination && <PaginationFooter pagination={data.pagination} />}
            </>
          )}
        </ContentLayout>
      </Main>

      {showUploadAssetDialog && (
        <UploadAssetDialog onClose={toggleUploadAssetDialog} onSuccess={() => {}} />
      )}
      {assetToEdit && (
        <EditAssetDialog
          onClose={() => setAssetToEdit(undefined)}
          asset={assetToEdit}
          canUpdate={canUpdate}
          canCopyLink={canCopyLink}
          canDownload={canDownload}
        />
      )}
    </Layout>
  );
};
