import * as React from 'react';

import {
  ContentLayout,
  EmptyStateLayout,
  HeaderLayout,
  LinkButton,
  Main,
} from '@strapi/design-system';
import {
  useAPIErrorHandler,
  useFocusWhenNavigate,
  useGuidedTour,
  useNotification,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { EmptyDocuments, Plus } from '@strapi/icons';
import { Entity } from '@strapi/types';
import * as qs from 'qs';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { Page } from '../../../../components/PageHelpers';
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
    allowedActions: { canRead, canCreate, canDelete, canUpdate },
  } = useRBAC(permissions);
  const navigate = useNavigate();
  const { trackUsage } = useTracking();
  const { startSection } = useGuidedTour();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  React.useEffect(() => {
    startSection('apiTokens');
  }, [startSection]);

  React.useEffect(() => {
    navigate({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [navigate]);

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

  const { data: apiTokens = [], isLoading, error } = useGetAPITokensQuery();

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
    <>
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'API Tokens' }
        )}
      />
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
      {!canRead ? (
        <Page.NoPermissions />
      ) : (
        <Main aria-busy={isLoading}>
          <ContentLayout>
            {apiTokens.length > 0 && (
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
            {canCreate && apiTokens.length === 0 ? (
              <EmptyStateLayout
                icon={<EmptyDocuments width="10rem" />}
                content={formatMessage({
                  id: 'Settings.apiTokens.addFirstToken',
                  defaultMessage: 'Add your first API Token',
                })}
                action={
                  <LinkButton
                    variant="secondary"
                    startIcon={<Plus />}
                    to="/settings/api-tokens/create"
                  >
                    {formatMessage({
                      id: 'Settings.apiTokens.addNewToken',
                      defaultMessage: 'Add new API Token',
                    })}
                  </LinkButton>
                }
              />
            ) : null}
            {!canCreate && apiTokens.length === 0 ? (
              <EmptyStateLayout
                icon={<EmptyDocuments width="10rem" />}
                content={formatMessage({
                  id: 'Settings.apiTokens.emptyStateLayout',
                  defaultMessage: 'You don’t have any content yet...',
                })}
              />
            ) : null}
          </ContentLayout>
        </Main>
      )}
    </>
  );
};

export const ProtectedListView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['api-tokens'].main
  );

  return (
    <Page.Protect permissions={permissions}>
      <ListView />
    </Page.Protect>
  );
};
