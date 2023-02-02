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
  DynamicTable,
  useTracking,
  useGuidedTour,
  LinkButton,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import Plus from '@strapi/icons/Plus';

import { axiosInstance } from '../../../../../core/utils';
import adminPermissions from '../../../../../permissions';
import tableHeaders from './utils/tableHeaders';
import TableRows from './DynamicTable';

const TransferTokenListView = () => {
  useFocusWhenNavigate();
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const {
    allowedActions: { canCreate, canDelete, canUpdate, canRead },
  } = useRBAC(adminPermissions.settings['transfer-tokens']);
  const { push } = useHistory();
  const { trackUsage } = useTracking();
  const { startSection } = useGuidedTour();
  const startSectionRef = useRef(startSection);

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
  } = useQuery(
    ['transfer-tokens'],
    async () => {
      trackUsage('willAccessTokenList');
      const {
        data: { data },
      } = await axiosInstance.get(`/admin/transfer/tokens`);

      // trackUsage('didAccessTokenList', { number: data.length }); // TODO What should we track?

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
      await axiosInstance.delete(`/admin/transfer/tokens/${id}`); // TODO change this
    },
    {
      async onSuccess() {
        await queryClient.invalidateQueries(['transfer-tokens']); // TODO change this
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

  const shouldDisplayDynamicTable = canRead && transferTokens;
  const shouldDisplayNoContent = canRead && !transferTokens && !canCreate;
  const shouldDisplayNoContentWithCreationButton = canRead && !transferTokens && canCreate;

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
              // onClick={() => trackUsage('willAddTokenFromList')}
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
          <DynamicTable
            headers={headers}
            contentType="trasfer-tokens"
            rows={transferTokens}
            withBulkActions={canDelete || canUpdate || canRead}
            isLoading={isLoading}
            onConfirmDelete={(id) => deleteMutation.mutateAsync(id)}
          >
            <TableRows
              canRead={canRead}
              canDelete={canDelete}
              canUpdate={canUpdate}
              rows={transferTokens}
              withBulkActions={canDelete || canUpdate || canRead}
            />
          </DynamicTable>
        )}
        {shouldDisplayNoContentWithCreationButton && (
          <NoContent
            content={{
              id: 'Settings.transferTokens.addFirstToken',
              defaultMessage: 'Add your first Transfer Token',
            }}
            action={
              <Button variant="secondary" startIcon={<Plus />}>
                {formatMessage({
                  id: 'Settings.transferTokens.addNewToken',
                  defaultMessage: 'Add new Transfer Token',
                })}
              </Button>
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
