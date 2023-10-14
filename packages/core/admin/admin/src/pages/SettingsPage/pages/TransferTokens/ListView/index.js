import React, { useEffect, useRef } from 'react';

import { ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import {
  LinkButton,
  NoContent,
  NoPermissions,
  SettingsPageTitle,
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
import { useMutation, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { selectAdminPermissions } from '../../../../App/selectors';
import { TRANSFER_TOKEN_TYPE } from '../../../components/Tokens/constants';
import Table from '../../../components/Tokens/Table';

import tableHeaders from './utils/tableHeaders';

const TransferTokenListView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const permissions = useSelector(selectAdminPermissions);
  const {
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(permissions.settings['transfer-tokens']);
  const { push } = useHistory();
  const { trackUsage } = useTracking();

  const { startSection } = useGuidedTour();
  const startSectionRef = useRef(startSection);
  const { get, del } = useFetchClient();

  useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('transferTokens');
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
    data: transferTokens,
    status,
    isFetching,
    refetch,
  } = useQuery(
    ['transfer-tokens'],
    async () => {
      trackUsage('willAccessTokenList', {
        tokenType: TRANSFER_TOKEN_TYPE,
      });
      const {
        data: { data },
      } = await get(`/admin/transfer/tokens`);

      trackUsage('didAccessTokenList', { number: data.length, tokenType: TRANSFER_TOKEN_TYPE });

      return data;
    },
    {
      enabled: canRead,
      onError(err) {
        if (err?.response?.data?.error?.details?.code === 'INVALID_TOKEN_SALT') {
          toggleNotification({
            type: 'warning',
            message: {
              id: 'notification.error.invalid.configuration',
              defaultMessage:
                'You have an invalid configuration, check your server log for more information.',
            },
          });
        } else {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occured' },
          });
        }
      },
    }
  );

  const isLoading =
    canRead &&
    ((status !== 'success' && status !== 'error') || (status === 'success' && isFetching));

  const deleteMutation = useMutation(
    async (id) => {
      await del(`/admin/transfer/tokens/${id}`);
    },
    {
      async onSuccess() {
        await refetch(['transfer-tokens']);
      },
      onError(err) {
        if (err?.response?.data?.data) {
          toggleNotification({ type: 'warning', message: err.response.data.data });
        } else if (err?.response?.data?.error?.details?.code === 'INVALID_TOKEN_SALT') {
          toggleNotification({
            type: 'warning',
            message: {
              id: 'notification.error.invalid.configuration',
              defaultMessage:
                'You have an invalid configuration, check your server log for more information.',
            },
          });
        } else {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occured' },
          });
        }
      },
    }
  );

  const hasTransferTokens = transferTokens && transferTokens?.length > 0;
  const shouldDisplayDynamicTable = canRead && hasTransferTokens;
  const shouldDisplayNoContent = canRead && !hasTransferTokens && !canCreate;
  const shouldDisplayNoContentWithCreationButton = canRead && !hasTransferTokens && canCreate;

  return (
    <Main aria-busy={isLoading}>
      <SettingsPageTitle name="Transfer Tokens" />
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
        {shouldDisplayDynamicTable && (
          <Table
            permissions={{ canRead, canDelete, canUpdate }}
            headers={headers}
            contentType="trasfer-tokens"
            rows={transferTokens}
            isLoading={isLoading}
            onConfirmDelete={(id) => deleteMutation.mutateAsync(id)}
            tokens={transferTokens}
            tokenType={TRANSFER_TOKEN_TYPE}
          />
        )}
        {shouldDisplayNoContentWithCreationButton && (
          <NoContent
            content={{
              id: 'Settings.transferTokens.addFirstToken',
              defaultMessage: 'Add your first Transfer Token',
            }}
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
          />
        )}
        {shouldDisplayNoContent && (
          <NoContent
            content={{
              id: 'Settings.transferTokens.emptyStateLayout',
              defaultMessage: 'You don’t have any content yet...',
            }}
          />
        )}
      </ContentLayout>
    </Main>
  );
};

export default TransferTokenListView;
