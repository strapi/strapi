import * as React from 'react';

import {
  ContentLayout,
  EmptyStateLayout,
  HeaderLayout,
  LinkButton,
  Main,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  NoPermissions,
  useAPIErrorHandler,
  useFocusWhenNavigate,
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

import { useTypedSelector } from '../../../../core/store/hooks';
import { useOnce } from '../../../../hooks/useOnce';
import {
  useDeleteTransferTokenMutation,
  useGetTransferTokensQuery,
} from '../../../../services/transferTokens';
import { TRANSFER_TOKEN_TYPE } from '../../components/Tokens/constants';
import { Table } from '../../components/Tokens/Table';

const tableHeaders = [
  {
    name: 'name',
    key: 'name',
    metadatas: {
      label: {
        id: 'Settings.tokens.ListView.headers.name',
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
        id: 'Settings.tokens.ListView.headers.description',
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
        id: 'Settings.tokens.ListView.headers.createdAt',
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
        id: 'Settings.tokens.ListView.headers.lastUsedAt',
        defaultMessage: 'Last used',
      },
      sortable: false,
    },
  },
] as const;

/* -------------------------------------------------------------------------------------------------
 * ListView
 * -----------------------------------------------------------------------------------------------*/

const ListView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['transfer-tokens']
  );
  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(permissions);
  const navigate = useNavigate();
  const { trackUsage } = useTracking();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  React.useEffect(() => {
    navigate({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [navigate]);

  useOnce(() => {
    trackUsage('willAccessTokenList', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });
  });

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  const {
    data: transferTokens = [],
    isLoading: isLoadingTokens,
    error,
  } = useGetTransferTokensQuery(undefined, {
    skip: !canRead,
  });

  React.useEffect(() => {
    if (transferTokens) {
      trackUsage('didAccessTokenList', {
        number: transferTokens.length,
        tokenType: TRANSFER_TOKEN_TYPE,
      });
    }
  }, [trackUsage, transferTokens]);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  const [deleteToken] = useDeleteTransferTokenMutation();

  const handleDelete = async (id: Entity.ID) => {
    try {
      const res = await deleteToken(id);

      if ('error' in res) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });
      }
    } catch {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    }
  };

  const isLoading = isLoadingTokens || isLoadingRBAC;

  return (
    <Main aria-busy={isLoading}>
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Transfer Tokens',
          }
        )}
      />
      <HeaderLayout
        title={formatMessage({
          id: 'Settings.transferTokens.title',
          defaultMessage: 'Transfer Tokens',
        })}
        subtitle={formatMessage({
          id: 'Settings.transferTokens.description',
          defaultMessage: '"List of generated transfer tokens"', // TODO change this message
        })}
        primaryAction={
          canCreate ? (
            <LinkButton
              data-testid="create-transfer-token-button"
              startIcon={<Plus />}
              size="S"
              onClick={() =>
                trackUsage('willAddTokenFromList', {
                  tokenType: TRANSFER_TOKEN_TYPE,
                })
              }
              to="/settings/transfer-tokens/create"
            >
              {formatMessage({
                id: 'Settings.transferTokens.create',
                defaultMessage: 'Create new Transfer Token',
              })}
            </LinkButton>
          ) : undefined
        }
      />
      <ContentLayout>
        {!canRead && <NoPermissions />}
        {canRead && transferTokens.length > 0 && (
          <Table
            permissions={{ canRead, canDelete, canUpdate }}
            headers={headers}
            contentType="trasfer-tokens"
            isLoading={isLoading}
            onConfirmDelete={handleDelete}
            tokens={transferTokens}
            tokenType={TRANSFER_TOKEN_TYPE}
          />
        )}
        {canRead && canCreate && transferTokens.length === 0 ? (
          <EmptyStateLayout
            action={
              <LinkButton
                variant="secondary"
                startIcon={<Plus />}
                to="/settings/transfer-tokens/create"
              >
                {formatMessage({
                  id: 'Settings.transferTokens.addNewToken',
                  defaultMessage: 'Add new Transfer Token',
                })}
              </LinkButton>
            }
            icon={<EmptyDocuments width="10rem" />}
            content={formatMessage({
              id: 'Settings.transferTokens.addFirstToken',
              defaultMessage: 'Add your first Transfer Token',
            })}
          />
        ) : null}
        {canRead && !canCreate && transferTokens.length === 0 ? (
          <EmptyStateLayout
            icon={<EmptyDocuments width="10rem" />}
            content={formatMessage({
              id: 'Settings.transferTokens.emptyStateLayout',
              defaultMessage: 'You don’t have any content yet...',
            })}
          />
        ) : null}
      </ContentLayout>
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedListView
 * -----------------------------------------------------------------------------------------------*/

const ProtectedListView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['transfer-tokens'].main
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <ListView />
    </CheckPagePermissions>
  );
};

export { ListView, ProtectedListView };
