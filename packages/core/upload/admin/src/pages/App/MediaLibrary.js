import React, { useState } from 'react'; // useState
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import {
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  NoPermissions,
  NoMedia,
  AnErrorOccurred,
  Search,
  useSelectionState,
} from '@strapi/helper-plugin';
import { Layout, HeaderLayout, ContentLayout, ActionLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Button } from '@strapi/parts/Button';
import AddIcon from '@strapi/icons/AddIcon';
import { Box } from '@strapi/parts/Box';
import { BaseCheckbox } from '@strapi/parts/BaseCheckbox';
import { UploadAssetDialog } from '../../components/UploadAssetDialog/UploadAssetDialog';
import { EditAssetDialog } from '../../components/EditAssetDialog';
import { AssetList } from '../../components/AssetList';
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
  const [selected, { selectOne, selectAll }] = useSelectionState('id', []);
  const toggleUploadAssetDialog = () => setShowUploadAssetDialog(prev => !prev);

  useFocusWhenNavigate();

  const loading = isLoadingPermissions || isLoading;
  const assets = data?.results;
  const assetCount = data?.pagination?.total || 0;

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
              <Button startIcon={<AddIcon />} onClick={toggleUploadAssetDialog}>
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
                    onChange={() => selectAll(assets)}
                  />
                </BoxWithHeight>
              )}
              {canRead && <SortPicker />}
              {canRead && <Filters />}
            </>
          }
          endActions={
            <Search
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
            <NoMedia
              action={
                canCreate ? (
                  <Button
                    variant="secondary"
                    startIcon={<AddIcon />}
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
