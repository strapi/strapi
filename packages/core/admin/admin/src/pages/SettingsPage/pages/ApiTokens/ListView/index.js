import React, { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  useNotification,
  NoPermissions,
  useRBAC,
  NoContent,
  DynamicTable,
  useTracking,
  useGuidedTour,
  LinkButton,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import Plus from '@strapi/icons/Plus';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';
import qs from 'qs';
import { axiosInstance } from '../../../../../core/utils';
import adminPermissions from '../../../../../permissions';
import tableHeaders from './utils/tableHeaders';
import TableRows from './DynamicTable';

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

  useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('apiTokens');
    }
  }, []);

  useEffect(() => {
    push({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [push]);

  const { data: apiTokens, status, isFetching } = useQuery(
    ['api-tokens'],
    async () => {
      trackUsage('willAccessTokenList');
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/api-tokens`);

      trackUsage('didAccessTokenList', { number: data.length });

      return data;
    },
    {
      enabled: canRead,
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occurred' },
        });
      },
    }
  );

  const isLoading =
    canRead &&
    ((status !== 'success' && status !== 'error') || (status === 'success' && isFetching));

  const deleteMutation = useMutation(
    async id => {
      await axiosInstance.delete(`/admin/api-tokens/${id}`);
    },
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries(['api-tokens']);
        trackUsage('didDeleteToken');
      },
      onError: err => {
        if (err?.response?.data?.data) {
          toggleNotification({ type: 'warning', message: err.response.data.data });
        } else {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occurred' },
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
              size="L"
              onClick={() => trackUsage('willAddTokenFromList')}
              to="/settings/api-tokens/create"
            >
              {formatMessage({
                id: 'Settings.apiTokens.create',
                defaultMessage: 'Create new API Token',
              })}
            </LinkButton>
          ) : (
            undefined
          )
        }
      />
      <ContentLayout>
        {!canRead && <NoPermissions />}
        {shouldDisplayDynamicTable && (
          <DynamicTable
            headers={tableHeaders}
            contentType="api-tokens"
            rows={apiTokens}
            withBulkActions={canDelete || canUpdate}
            isLoading={isLoading}
            onConfirmDelete={id => deleteMutation.mutateAsync(id)}
          >
            <TableRows
              canDelete={canDelete}
              canUpdate={canUpdate}
              rows={apiTokens}
              withBulkActions={canDelete || canUpdate}
            />
          </DynamicTable>
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
