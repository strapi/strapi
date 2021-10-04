import React, { useState } from 'react'; // useState
import { Redirect } from 'react-router-dom';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import {
  LoadingIndicatorPage,
  useRBAC,
  useFocusWhenNavigate,
  NoPermissions,
  NoMedia,
  AnErrorOccurred,
  Search,
} from '@strapi/helper-plugin';
import { Layout, HeaderLayout, ContentLayout, ActionLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Button } from '@strapi/parts/Button';
import AddIcon from '@strapi/icons/AddIcon';
import { Box } from '@strapi/parts/Box';
import { BaseCheckbox } from '@strapi/parts/BaseCheckbox';
import { UploadAssetDialog } from '../../components/UploadAssetDialog/UploadAssetDialog';
import { EditAssetDialog } from '../../components/EditAssetDialog';
import { ListView } from './components/ListView';
import { useAssets } from '../../hooks/useAssets';
import { getTrad } from '../../utils';
import pluginPermissions from '../../permissions';
import { Filters } from './components/Filters';

const BoxWithHeight = styled(Box)`
  height: ${32 / 16}rem;
  display: flex;
  align-items: center;
`;

export const MediaLibrary = () => {
  const state = useRBAC(pluginPermissions);
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useAssets({
    skipWhen: !state.allowedActions.canMain,
  });

  const [showUploadAssetDialog, setShowUploadAssetDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const toggleUploadAssetDialog = () => setShowUploadAssetDialog(prev => !prev);

  useFocusWhenNavigate();

  const canRead = state.allowedActions.canMain;
  const loading = state.isLoading || isLoading;

  if (!loading && !canRead) {
    return <Redirect to="/" />;
  }

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
                data?.length > 0
                  ? 'header.content.assets-multiple'
                  : 'header.content.assets.assets-single'
              ),
              defaultMessage: '0 assets',
            },
            { number: data?.length || 0 }
          )}
          primaryAction={
            <Button startIcon={<AddIcon />} onClick={toggleUploadAssetDialog}>
              {formatMessage({
                id: getTrad('header.actions.upload-assets'),
                defaultMessage: 'Upload new assets',
              })}
            </Button>
          }
        />

        <ActionLayout
          startActions={
            <>
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
                />
              </BoxWithHeight>
              <Filters />
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
          {loading && <LoadingIndicatorPage />}
          {error && <AnErrorOccurred />}
          {!canRead && <NoPermissions />}
          {canRead && data && data.length === 0 && (
            <NoMedia
              action={
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
              }
              content={formatMessage({
                id: getTrad('list.assets.empty'),
                defaultMessage: 'Upload your first assets...',
              })}
            />
          )}
          {canRead && data && data.length > 0 && (
            <ListView assets={data} onEditAsset={setAssetToEdit} />
          )}
        </ContentLayout>
      </Main>

      {showUploadAssetDialog && (
        <UploadAssetDialog onClose={toggleUploadAssetDialog} onSuccess={() => {}} />
      )}
      {assetToEdit && (
        <EditAssetDialog onClose={() => setAssetToEdit(undefined)} asset={assetToEdit} />
      )}
    </Layout>
  );
};
