import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  useNotification,
  NoPermissions,
  useRBAC,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Button } from '@strapi/parts/Button';
import AddIcon from '@strapi/icons/AddIcon';
import { useQuery } from 'react-query';
import { useLocation, useHistory } from 'react-router-dom';
import qs from 'qs';
import DynamicTable from './DynamicTable';
import { axiosInstance } from '../../../../../core/utils';
import adminPermissions from '../../../../../permissions';

const ApiTokenListView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const {
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(adminPermissions.settings['api-tokens']);
  const { search } = useLocation();
  const { push } = useHistory();

  useEffect(() => {
    push({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [push]);

  const createAction = () => {
    if (!canCreate) {
      return null;
    }

    return (
      <Button data-testid="create-api-token-button" startIcon={<AddIcon />} size="L">
        {formatMessage({
          id: 'Settings.apiTokens.create',
          defaultMessage: 'Add Entry',
        })}
      </Button>
    );
  };

  const { data: apiTokens, status, isFetching } = useQuery(
    ['api-tokens', search],
    async () => {
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/api-tokens`);

      return data;
    },
    {
      enabled: !!canRead,
      keepPreviousData: true,
      retry: false,
      staleTime: 1000 * 20,
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const isLoading = () => {
    if (!canRead) {
      return false;
    }

    if (status !== 'success' && status !== 'error') {
      return true;
    }

    if (status === 'success' && isFetching) {
      return true;
    }

    return false;
  };

  const contentBasedOnPermissions = () => {
    if (canRead) {
      return (
        <DynamicTable
          canUpdate={canUpdate}
          canDelete={canDelete}
          canCreate={canCreate}
          apiTokens={apiTokens}
          isLoading={isLoading()}
        />
      );
    }

    return <NoPermissions />;
  };

  return (
    <Main aria-busy={isLoading()}>
      <SettingsPageTitle name="API Tokens" />
      <HeaderLayout
        title={formatMessage({ id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' })}
        subtitle={formatMessage({
          id: 'Settings.apiTokens.description',
          defaultMessage: 'List of generated tokens to consume the API',
        })}
        primaryAction={createAction()}
      />
      <ContentLayout>{contentBasedOnPermissions()}</ContentLayout>
    </Main>
  );
};

export default ApiTokenListView;
