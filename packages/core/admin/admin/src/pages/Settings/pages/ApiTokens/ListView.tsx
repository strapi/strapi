import * as React from 'react';

import { ContentLayout, HeaderLayout, LinkButton, Main } from '@strapi/design-system';
import {
  CheckPagePermissions,
  NoContent,
  NoPermissions,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFocusWhenNavigate,
  useGuidedTour,
  useNotification,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { Entity } from '@strapi/types';
import qs from 'qs';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { useTypedSelector } from '../../../../core/store/hooks';
import { useOnce } from '../../../../hooks/useOnce';
import { useDeleteAPITokenMutation, useGetAPITokensQuery } from '../../../../services/apiTokens';
import { API_TOKEN_TYPE } from '../../components/Tokens/constants';
import { Table } from '../../components/Tokens/Table';

const TABLE_HEADERS = [
  {
    name: 'name',
    key: 'name',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.name',
        defaultMessage: 'Name',
      },
      sortable: true,
    },
  },
  {
    name: 'description',
    key: 'description',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.description',
        defaultMessage: 'Description',
      },
      sortable: false,
    },
  },
  {
    name: 'createdAt',
    key: 'createdAt',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.createdAt',
        defaultMessage: 'Created at',
      },
      sortable: false,
    },
  },
  {
    name: 'lastUsedAt',
    key: 'lastUsedAt',
    metadatas: {
      label: {
        id: 'Settings.apiTokens.ListView.headers.lastUsedAt',
        defaultMessage: 'Last used',
      },
      sortable: false,
    },
  },
];

export const ListView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['api-tokens']
  );
  const {
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(permissions);
  const { push } = useHistory();
  const { trackUsage } = useTracking();
  const { startSection } = useGuidedTour();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  React.useEffect(() => {
    startSection('apiTokens');
  }, [startSection]);

  React.useEffect(() => {
    push({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [push]);

  const headers = TABLE_HEADERS.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  useOnce(() => {
    trackUsage('willAccessTokenList', {
      tokenType: API_TOKEN_TYPE,
    });
  });

  const {
    data: apiTokens = [],
    isLoading,
    error,
  } = useGetAPITokensQuery(undefined, {
    skip: !canRead,
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    trackUsage('didAccessTokenList', { number: apiTokens.length, tokenType: API_TOKEN_TYPE });
  }, [apiTokens, trackUsage]);

  const [deleteToken] = useDeleteAPITokenMutation();

  const handleDelete = async (id: Entity.ID) => {
    try {
      const res = await deleteToken(id);

      if ('error' in res) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });

        return;
      }

      trackUsage('didDeleteToken');
    } catch {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'Something went wrong',
        },
      });
    }
  };

  return (
    <Main aria-busy={isLoading}>
      {/* TODO: this needs to be translated */}
      <SettingsPageTitle name="API Tokens" />
      <HeaderLayout
        title={formatMessage({ id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' })}
        subtitle={formatMessage({
          id: 'Settings.apiTokens.description',
          defaultMessage: 'List of generated tokens to consume the API',
        })}
        primaryAction={
          canCreate && (
            <LinkButton
              data-testid="create-api-token-button"
              startIcon={<Plus />}
              size="S"
              onClick={() =>
                trackUsage('willAddTokenFromList', {
                  tokenType: API_TOKEN_TYPE,
                })
              }
              to="/settings/api-tokens/create"
            >
              {formatMessage({
                id: 'Settings.apiTokens.create',
                defaultMessage: 'Create new API Token',
              })}
            </LinkButton>
          )
        }
      />
      <ContentLayout>
        {!canRead && <NoPermissions />}
        {canRead && apiTokens.length > 0 && (
          <Table
            permissions={{ canRead, canDelete, canUpdate }}
            headers={headers}
            contentType="api-tokens"
            isLoading={isLoading}
            onConfirmDelete={handleDelete}
            tokens={apiTokens}
            tokenType={API_TOKEN_TYPE}
          />
        )}
        {canRead && canCreate && apiTokens.length === 0 && (
          <NoContent
            content={{
              id: 'Settings.apiTokens.addFirstToken',
              defaultMessage: 'Add your first API Token',
            }}
            action={
              <LinkButton variant="secondary" startIcon={<Plus />} to="/settings/api-tokens/create">
                {formatMessage({
                  id: 'Settings.apiTokens.addNewToken',
                  defaultMessage: 'Add new API Token',
                })}
              </LinkButton>
            }
          />
        )}
        {canRead && !canCreate && apiTokens.length === 0 && (
          <NoContent
            content={{
              id: 'Settings.apiTokens.emptyStateLayout',
              defaultMessage: 'You don’t have any content yet...',
            }}
          />
        )}
      </ContentLayout>
    </Main>
  );
};

export const ProtectedListView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['api-tokens'].main
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <ListView />
    </CheckPagePermissions>
  );
};
