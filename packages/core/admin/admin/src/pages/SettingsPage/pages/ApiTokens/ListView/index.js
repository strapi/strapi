import React, { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';
import qs from 'qs';

import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  useNotification,
  NoPermissions,
  useRBAC,
  NoContent,
  useTracking,
  useGuidedTour,
  useFetchClient,
  LinkButton,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout, Main, Button } from '@strapi/design-system';
import { Plus } from '@strapi/icons';

import adminPermissions from '../../../../../permissions';
import tableHeaders from './utils/tableHeaders';
import Table from '../../../components/Tokens/Table';
import { API_TOKEN_TYPE } from '../../../components/Tokens/constants';

const ApiTokenListView = () => {
  useFocusWhenNavigate();
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const {
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(adminPermissions.settings['api-tokens']);
  const { push } = useHistory();
  const { trackUsage } = useTracking();
  const { startSection } = useGuidedTour();
  const startSectionRef = useRef(startSection);
  const { get, del } = useFetchClient();

  useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('apiTokens');
    }
  }, []);

  useEffect(() => {
    push({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [push]);

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  const {
    data: apiTokens,
    status,
    isFetching,
  } = useQuery(
    ['api-tokens'],
    async () => {
      trackUsage('willAccessTokenList', {
        tokenType: API_TOKEN_TYPE,
      });
      const {
        data: { data },
      } = await get(`/admin/api-tokens`);

      trackUsage('didAccessTokenList', { number: data.length, tokenType: API_TOKEN_TYPE });

      return data;
    },
    {
      enabled: canRead,
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const isLoading =
    canRead &&
    ((status !== 'success' && status !== 'error') || (status === 'success' && isFetching));

  const deleteMutation = useMutation(
    async (id) => {
      await del(`/admin/api-tokens/${id}`);
    },
    {
      async onSuccess() {
        await queryClient.invalidateQueries(['api-tokens']);
        trackUsage('didDeleteToken');
      },
      onError(err) {
        if (err?.response?.data?.data) {
          toggleNotification({ type: 'warning', message: err.response.data.data });
        } else {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occured' },
          });
        }
      },
    }
  );

  const shouldDisplayDynamicTable = canRead && apiTokens;
  const shouldDisplayNoContent = canRead && !apiTokens && !canCreate;
  const shouldDisplayNoContentWithCreationButton = canRead && !apiTokens && canCreate;

  return (
    <Main aria-busy={isLoading}>
      <SettingsPageTitle name="API Tokens" />
      <HeaderLayout
        title={formatMessage({ id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' })}
        subtitle={formatMessage({
          id: 'Settings.apiTokens.description',
          defaultMessage: 'List of generated tokens to consume the API',
        })}
        primaryAction={
          canCreate ? (
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
          ) : undefined
        }
      />
      <ContentLayout>
        {!canRead && <NoPermissions />}
        {shouldDisplayDynamicTable && (
          <Table
            permissions={{ canRead, canDelete, canUpdate }}
            headers={headers}
            contentType="api-tokens"
            rows={apiTokens}
            isLoading={isLoading}
            onConfirmDelete={(id) => deleteMutation.mutateAsync(id)}
            tokens={apiTokens}
            tokenType={API_TOKEN_TYPE}
          />
        )}
        {shouldDisplayNoContentWithCreationButton && (
          <NoContent
            content={{
              id: 'Settings.apiTokens.addFirstToken',
              defaultMessage: 'Add your first API Token',
            }}
            action={
              <Button variant="secondary" startIcon={<Plus />}>
                {formatMessage({
                  id: 'Settings.apiTokens.addNewToken',
                  defaultMessage: 'Add new API Token',
                })}
              </Button>
            }
          />
        )}
        {shouldDisplayNoContent && (
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

export default ApiTokenListView;
