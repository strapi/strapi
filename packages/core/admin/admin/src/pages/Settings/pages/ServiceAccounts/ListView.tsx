import * as React from 'react';

import { Box, EmptyStateLayout, LinkButton } from '@strapi/design-system';
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
  useDeleteServiceAccountMutation,
  useGetServiceAccountsQuery,
} from '../../../../services/serviceAccounts';
import { Table } from '../../components/Tokens/Table';

import type { Data } from '@strapi/types';
import type { PermissionMap } from '../../../../types/permissions';

const TABLE_HEADERS = [
  {
    name: 'name',
    label: {
      id: 'Settings.serviceAccounts.ListView.headers.name',
      defaultMessage: 'Name',
    },
    sortable: true,
  },
  {
    name: 'description',
    label: {
      id: 'Settings.serviceAccounts.ListView.headers.description',
      defaultMessage: 'Description',
    },
    sortable: false,
  },
  {
    name: 'roles',
    label: {
      id: 'Settings.serviceAccounts.ListView.headers.roles',
      defaultMessage: 'Roles',
    },
    sortable: false,
  },
  {
    name: 'createdAt',
    label: {
      id: 'Settings.serviceAccounts.ListView.headers.createdAt',
      defaultMessage: 'Created at',
    },
    sortable: false,
  },
  {
    name: 'lastUsedAt',
    label: {
      id: 'Settings.serviceAccounts.ListView.headers.lastUsedAt',
      defaultMessage: 'Last used',
    },
    sortable: false,
  },
];

export const ListView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const permissions = useTypedSelector(
    (state) =>
      (state.admin_app.permissions.settings as PermissionMap['settings'])?.['service-accounts']
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
      tokenType: 'service-account',
    });
  });

  const { data: serviceAccounts = [], isLoading, error } = useGetServiceAccountsQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    trackUsage('didAccessTokenList', { number: serviceAccounts.length, tokenType: 'service-account' });
  }, [serviceAccounts, trackUsage]);

  const [deleteToken] = useDeleteServiceAccountMutation();

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

  // Service accounts already have roles as array of objects
  const tokensWithRoles = serviceAccounts;

  return (
    <>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'Service Accounts' }
        )}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({
          id: 'Settings.serviceAccounts.title',
          defaultMessage: 'Service Accounts',
        })}
        subtitle={formatMessage({
          id: 'Settings.serviceAccounts.description',
          defaultMessage: 'List of generated service account tokens',
        })}
        primaryAction={
          canCreate && (
            <LinkButton
              tag={Link}
              data-testid="create-service-account-button"
              startIcon={<Plus />}
              size="S"
              onClick={() =>
                trackUsage('willAddTokenFromList', {
                  tokenType: 'service-account',
                })
              }
              to="/settings/service-accounts/create"
            >
              {formatMessage({
                id: 'Settings.serviceAccounts.create',
                defaultMessage: 'Create new Service Account',
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
            {tokensWithRoles.length > 0 && (
              <Table
                permissions={{ canRead, canDelete, canUpdate }}
                headers={headers}
                isLoading={isLoading}
                onConfirmDelete={handleDelete}
                tokens={tokensWithRoles}
                tokenType="service-account"
              />
            )}
            {canCreate && tokensWithRoles.length === 0 ? (
              <EmptyStateLayout
                icon={<EmptyDocuments width="16rem" />}
                content={formatMessage({
                  id: 'Settings.serviceAccounts.addFirstToken',
                  defaultMessage: 'Add your first Service Account',
                })}
                action={
                  <LinkButton
                    tag={Link}
                    variant="secondary"
                    startIcon={<Plus />}
                    to="/settings/service-accounts/create"
                  >
                    {formatMessage({
                      id: 'Settings.serviceAccounts.addNewToken',
                      defaultMessage: 'Add new Service Account',
                    })}
                  </LinkButton>
                }
              />
            ) : null}
            {!canCreate && tokensWithRoles.length === 0 ? (
              <EmptyStateLayout
                icon={<EmptyDocuments width="16rem" />}
                content={formatMessage({
                  id: 'Settings.serviceAccounts.emptyStateLayout',
                  defaultMessage: 'You don\'t have any content yet...',
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
    (state) =>
      (state.admin_app.permissions.settings as PermissionMap['settings'])?.['service-accounts']?.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <ListView />
    </Page.Protect>
  );
};

