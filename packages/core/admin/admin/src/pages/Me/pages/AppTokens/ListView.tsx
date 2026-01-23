import * as React from 'react';

import { EmptyStateLayout, LinkButton } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import * as qs from 'qs';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';

import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useNotification } from '../../../../features/Notifications';
import { useTracking } from '../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useOnce } from '../../../../hooks/useOnce';
import { useDeleteAppTokenMutation, useGetAppTokensQuery } from '../../../../services/appTokens';
import { Table } from '../../../Settings/components/Tokens/Table';

import type { Data } from '@strapi/types';

const APP_TOKEN_TYPE = 'app-token' as const;

const TABLE_HEADERS = [
  {
    name: 'name',
    label: {
      id: 'Settings.appTokens.ListView.headers.name',
      defaultMessage: 'Name',
    },
    sortable: true,
  },
  {
    name: 'description',
    label: {
      id: 'Settings.appTokens.ListView.headers.description',
      defaultMessage: 'Description',
    },
    sortable: false,
  },
  {
    name: 'createdAt',
    label: {
      id: 'Settings.appTokens.ListView.headers.createdAt',
      defaultMessage: 'Created at',
    },
    sortable: false,
  },
  {
    name: 'lastUsedAt',
    label: {
      id: 'Settings.appTokens.ListView.headers.lastUsedAt',
      defaultMessage: 'Last used',
    },
    sortable: false,
  },
];

export const ListView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
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
      tokenType: APP_TOKEN_TYPE,
    });
  });

  const { data: appTokens = [], isLoading, error } = useGetAppTokensQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    trackUsage('didAccessTokenList', { number: appTokens.length, tokenType: APP_TOKEN_TYPE });
  }, [appTokens, trackUsage]);

  const [deleteToken] = useDeleteAppTokenMutation();

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
        {formatMessage({ id: 'Settings.appTokens.title', defaultMessage: 'App Tokens' })}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({ id: 'Settings.appTokens.title', defaultMessage: 'App Tokens' })}
        subtitle={formatMessage({
          id: 'Settings.appTokens.description',
          defaultMessage: 'List of your personal app tokens for MCP access',
        })}
        primaryAction={
          <LinkButton
            tag={Link}
            data-testid="create-app-token-button"
            startIcon={<Plus />}
            size="S"
            onClick={() =>
              trackUsage('willAddTokenFromList', {
                tokenType: APP_TOKEN_TYPE,
              })
            }
            to="/me/app-tokens/create"
          >
            {formatMessage({
              id: 'Settings.appTokens.create',
              defaultMessage: 'Create new App Token',
            })}
          </LinkButton>
        }
      />
      <Page.Main aria-busy={isLoading}>
        <Layouts.Content>
          {appTokens.length > 0 && (
            <Table
              permissions={{ canRead: true, canDelete: true, canUpdate: true }}
              headers={headers}
              isLoading={isLoading}
              onConfirmDelete={handleDelete}
              tokens={appTokens}
              tokenType={APP_TOKEN_TYPE}
            />
          )}
          {appTokens.length === 0 ? (
            <EmptyStateLayout
              icon={<EmptyDocuments width="16rem" />}
              content={formatMessage({
                id: 'Settings.appTokens.addFirstToken',
                defaultMessage: 'Add your first App Token',
              })}
              action={
                <LinkButton
                  tag={Link}
                  variant="secondary"
                  startIcon={<Plus />}
                  to="/me/app-tokens/create"
                >
                  {formatMessage({
                    id: 'Settings.appTokens.addNewToken',
                    defaultMessage: 'Add new App Token',
                  })}
                </LinkButton>
              }
            />
          ) : null}
        </Layouts.Content>
      </Page.Main>
    </>
  );
};

export const ProtectedListView = () => {
  // No permissions check needed - app tokens are user-scoped
  return <ListView />;
};
