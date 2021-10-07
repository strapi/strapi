import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  useNotification,
  NoPermissions,
  useRBAC,
  NoContent,
  DynamicTable,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Button } from '@strapi/parts/Button';
import AddIcon from '@strapi/icons/AddIcon';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';
import qs from 'qs';
import TableRows from './DynamicTable';
import { axiosInstance } from '../../../../../core/utils';
import adminPermissions from '../../../../../permissions';
import tableHeaders from './utils/tableHeaders';

const ApiTokenListView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const {
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(adminPermissions.settings['api-tokens']);
  const { push } = useHistory();

  useEffect(() => {
    push({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [push]);

  const { data: apiTokens, status, isFetching } = useQuery(
    ['api-tokens'],
    async () => {
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/api-tokens`);

      return data;
    },
    {
      enabled: !!canRead,
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
    if (!canRead) {
      return <NoPermissions />;
    }

    if (apiTokens) {
      return (
        <DynamicTable
          headers={tableHeaders}
          contentType="api-tokens"
          rows={apiTokens}
          withBulkActions={canDelete || canUpdate}
          isLoading={isLoading()}
        >
          <TableRows
            canDelete={canDelete}
            canUpdate={canUpdate}
            rows={apiTokens}
            withBulkActions={canDelete || canUpdate}
          />
        </DynamicTable>
      );
    }

    if (canCreate) {
      return (
        <NoContent
          content={{
            id: 'Settings.apiTokens.addFirstToken',
            defaultMessage: 'Add your first API Token',
          }}
          action={
            <Button variant="secondary" startIcon={<AddIcon />}>
              {formatMessage({
                id: 'Settings.apiTokens.addNewToken',
                defaultMessage: 'Add new API Token',
              })}
            </Button>
          }
        />
      );
    }

    return (
      <NoContent
        content={{
          id: 'Settings.apiTokens.emptyStateLayout',
          defaultMessage: 'There is no API tokens',
        }}
      />
    );
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
        primaryAction={
          canCreate ? (
            <Button data-testid="create-api-token-button" startIcon={<AddIcon />} size="L">
              {formatMessage({
                id: 'Settings.apiTokens.create',
                defaultMessage: 'Add Entry',
              })}
            </Button>
          ) : (
            undefined
          )
        }
      />
      <ContentLayout>{contentBasedOnPermissions()}</ContentLayout>
    </Main>
  );
};

export default ApiTokenListView;
