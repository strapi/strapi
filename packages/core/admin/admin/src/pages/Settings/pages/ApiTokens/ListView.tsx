import * as React from 'react';

import { EmptyStateLayout, LinkButton } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { Data } from '@strapi/types';
import * as qs from 'qs';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';

import { useGuidedTour } from '../../../../components/GuidedTour/Provider';
import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useTracking } from '../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useOnce } from '../../../../hooks/useOnce';
import { useRBAC } from '../../../../hooks/useRBAC';
import { useDeleteAPITokenMutation, useGetAPITokensQuery } from '../../../../services/apiTokens';
import { API_TOKEN_TYPE } from '../../components/Tokens/constants';
import { Table } from '../../components/Tokens/Table';

const TABLE_HEADERS = [
  {
    name: 'name',
    label: {
      id: 'Settings.apiTokens.ListView.headers.name',
      defaultMessage: 'Name',
    },
    sortable: true,
  },
  {
    name: 'description',
    label: {
      id: 'Settings.apiTokens.ListView.headers.description',
      defaultMessage: 'Description',
    },
    sortable: false,
  },
  {
    name: 'createdAt',
    label: {
      id: 'Settings.apiTokens.ListView.headers.createdAt',
      defaultMessage: 'Created at',
    },
    sortable: false,
  },
  {
    name: 'lastUsedAt',
    label: {
      id: 'Settings.apiTokens.ListView.headers.lastUsedAt',
      defaultMessage: 'Last used',
    },
    sortable: false,
  },
];

export const ListView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['api-tokens']
  );
  const {
    allowedActions: { canRead, canCreate, canDelete, canUpdate },
  } = useRBAC(permissions);
  const navigate = useNavigate();
  const { trackUsage } = useTracking();
  const startSection = useGuidedTour('ListView', (state) => state.startSection);
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  React.useEffect(() => {
    startSection('apiTokens');
  }, [startSection]);

  React.useEffect(() => {
    navigate({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [navigate]);

  const headers = TABLE_HEADERS.map((header) => ({
    ...header,
    label: formatMessage(header.label),
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
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    trackUsage('didAccessTokenList', { number: apiTokens.length, tokenType: API_TOKEN_TYPE });
  }, [apiTokens, trackUsage]);

  const [deleteToken] = useDeleteAPITokenMutation();

  const handleDelete = async (id: Data.ID) => {
    try {
      const res = await deleteToken(id);

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });

        return;
      }

      trackUsage('didDeleteToken');
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'Something went wrong',
        }),
      });
    }
  };

  return (
    <>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'API Tokens' }
        )}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({ id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' })}
        subtitle={formatMessage({
          id: 'Settings.apiTokens.description',
          defaultMessage: 'List of generated tokens to consume the API',
        })}
        primaryAction={
          canCreate && (
            <LinkButton
              tag={Link}
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
        <Page.Main aria-busy={isLoading}>
          <Layouts.Content>
            {apiTokens.length > 0 && (
              <Table
                permissions={{ canRead, canDelete, canUpdate }}
                headers={headers}
                isLoading={isLoading}
                onConfirmDelete={handleDelete}
                tokens={apiTokens}
                tokenType={API_TOKEN_TYPE}
              />
            )}
            {canCreate && apiTokens.length === 0 ? (
              <EmptyStateLayout
                icon={<EmptyDocuments width="16rem" />}
                content={formatMessage({
                  id: 'Settings.apiTokens.addFirstToken',
                  defaultMessage: 'Add your first API Token',
                })}
                action={
                  <LinkButton
                    tag={Link}
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
                icon={<EmptyDocuments width="16rem" />}
                content={formatMessage({
                  id: 'Settings.apiTokens.emptyStateLayout',
                  defaultMessage: 'You don’t have any content yet...',
                })}
              />
            ) : null}
          </Layouts.Content>
        </Page.Main>
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
