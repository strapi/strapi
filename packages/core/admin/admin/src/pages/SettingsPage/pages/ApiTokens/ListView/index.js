import * as React from 'react';

import { ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import {
  LinkButton,
  NoContent,
  NoPermissions,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useGuidedTour,
  useNotification,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import qs from 'qs';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { selectAdminPermissions } from '../../../../App/selectors';
import { API_TOKEN_TYPE } from '../../../components/Tokens/constants';
import Table from '../../../components/Tokens/Table';

import tableHeaders from './utils/tableHeaders';

const ApiTokenListView = () => {
  useFocusWhenNavigate();
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const permissions = useSelector(selectAdminPermissions);
  const {
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(permissions.settings['api-tokens']);
  const { push } = useHistory();
  const { trackUsage } = useTracking();
  const { startSection } = useGuidedTour();
  const startSectionRef = React.useRef(startSection);
  const { get, del } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  React.useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('apiTokens');
    }
  }, []);

  React.useEffect(() => {
    push({ search: qs.stringify({ sort: 'name:ASC' }, { encode: false }) });
  }, [push]);

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  const { data: apiTokens, isLoading: isLoadingTokens } = useQuery(
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
      cacheTime: 0,
      enabled: canRead,
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const isLoading = isLoadingTokens;

  const deleteMutation = useMutation(
    async (id) => {
      await del(`/admin/api-tokens/${id}`);
    },
    {
      async onSuccess() {
        await queryClient.invalidateQueries(['api-tokens']);
        trackUsage('didDeleteToken');
      },
      onError(error) {
        toggleNotification({ type: 'warning', message: formatAPIError(error) });
      },
    }
  );

  const hasApiTokens = apiTokens && apiTokens.length > 0;
  const shouldDisplayDynamicTable = canRead && hasApiTokens;
  const shouldDisplayNoContent = canRead && !hasApiTokens && !canCreate;
  const shouldDisplayNoContentWithCreationButton = canRead && !hasApiTokens && canCreate;

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
              <LinkButton variant="secondary" startIcon={<Plus />} to="/settings/api-tokens/create">
                {formatMessage({
                  id: 'Settings.apiTokens.addNewToken',
                  defaultMessage: 'Add new API Token',
                })}
              </LinkButton>
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
