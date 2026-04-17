import * as React from 'react';

import { EmptyStateLayout, LinkButton } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import * as qs from 'qs';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';

import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useTracking } from '../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useOnce } from '../../../../hooks/useOnce';
import { useRBAC } from '../../../../hooks/useRBAC';
import {
  useDeleteAdminTokenMutation,
  useGetAdminTokensQuery,
} from '../../../../services/apiTokens';
import { API_TOKEN_TYPE } from '../../components/Tokens/constants';
import { Table } from '../../components/Tokens/Table';

import type { Data } from '@strapi/types';

const TABLE_HEADERS = [
  {
    name: 'name',
    label: {
      id: 'Settings.adminTokens.ListView.headers.name',
      defaultMessage: 'Name',
    },
    sortable: true,
  },
  {
    name: 'description',
    label: {
      id: 'Settings.adminTokens.ListView.headers.description',
      defaultMessage: 'Description',
    },
    sortable: false,
  },
  {
    name: 'createdAt',
    label: {
      id: 'Settings.adminTokens.ListView.headers.createdAt',
      defaultMessage: 'Created at',
    },
    sortable: false,
  },
  {
    name: 'lastUsedAt',
    label: {
      id: 'Settings.adminTokens.ListView.headers.lastUsedAt',
      defaultMessage: 'Last used',
    },
    sortable: false,
  },
  {
    name: 'adminUserOwner',
    label: {
      id: 'Settings.adminTokens.ListView.headers.owner',
      defaultMessage: 'Owner',
    },
    sortable: false,
  },
];

export const ListView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['admin-tokens']
  );
  const {
    allowedActions: { canRead, canCreate, canDelete, canUpdate },
  } = useRBAC(permissions);
  const navigate = useNavigate();
  const { trackUsage } = useTracking();

  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  React.useEffect(() => {
    navigate({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) }, { replace: true });
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

  const { data: adminTokens = [], isLoading, error } = useGetAdminTokensQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    trackUsage('didAccessTokenList', { number: adminTokens.length, tokenType: API_TOKEN_TYPE });
  }, [adminTokens, trackUsage]);

  const [deleteToken] = useDeleteAdminTokenMutation();

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
          { name: 'Admin Tokens' }
        )}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({ id: 'Settings.adminTokens.title', defaultMessage: 'Admin Tokens' })}
        subtitle={formatMessage({
          id: 'Settings.adminTokens.description',
          defaultMessage: 'List of generated tokens to access the admin API',
        })}
        primaryAction={
          canCreate && (
            <LinkButton
              tag={Link}
              data-testid="create-admin-token-button"
              startIcon={<Plus />}
              size="S"
              onClick={() => trackUsage('willAddTokenFromList', { tokenType: API_TOKEN_TYPE })}
              to="/settings/admin-tokens/create"
            >
              {formatMessage({
                id: 'Settings.adminTokens.create',
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
            {adminTokens.length > 0 && (
              <Table
                permissions={{ canRead, canDelete, canUpdate }}
                headers={headers}
                isLoading={isLoading}
                onConfirmDelete={handleDelete}
                tokens={adminTokens}
                tokenType={API_TOKEN_TYPE}
                showOwner
              />
            )}
            {canCreate && adminTokens.length === 0 ? (
              <EmptyStateLayout
                icon={<EmptyDocuments width="16rem" />}
                content={formatMessage({
                  id: 'Settings.adminTokens.addFirstToken',
                  defaultMessage: 'Add your first Admin Token',
                })}
                action={
                  <LinkButton
                    tag={Link}
                    variant="secondary"
                    startIcon={<Plus />}
                    to="/settings/admin-tokens/create"
                  >
                    {formatMessage({
                      id: 'Settings.adminTokens.addNewToken',
                      defaultMessage: 'Add new Admin Token',
                    })}
                  </LinkButton>
                }
              />
            ) : null}
            {!canCreate && adminTokens.length === 0 ? (
              <EmptyStateLayout
                icon={<EmptyDocuments width="16rem" />}
                content={formatMessage({
                  id: 'Settings.adminTokens.emptyStateLayout',
                  defaultMessage: "You don't have any content yet...",
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
    (state) => state.admin_app.permissions.settings?.['admin-tokens']?.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <ListView />
    </Page.Protect>
  );
};
