import React, { useState } from 'react';
import qs from 'qs';
import {
  DynamicTable,
  SearchURLQuery,
  SettingsPageTitle,
  useRBAC,
  useNotification,
  useFocusWhenNavigate,
  NoPermissions,
  useAPIErrorHandler,
  useFetchClient,
} from '@strapi/helper-plugin';
import { ActionLayout, ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import { useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import CreateAction from 'ee_else_ce/pages/SettingsPage/pages/Users/ListPage/CreateAction';
import useLicenseLimitNotification from 'ee_else_ce/hooks/useLicenseLimitNotification';

import { useAdminUsers } from '../../../../../hooks/useAdminUsers';
import adminPermissions from '../../../../../permissions';
import TableRows from './DynamicTable/TableRows';
import Filters from '../../../components/Filters';
import ModalForm from './ModalForm';
import PaginationFooter from './PaginationFooter';
import displayedFilters from './utils/displayedFilters';
import tableHeaders from './utils/tableHeaders';

const EE_LICENSE_LIMIT_QUERY_KEY = ['ee', 'license-limit-info'];

const ListPage = () => {
  const { post } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const [isModalOpened, setIsModalOpen] = useState(false);
  const {
    allowedActions: { canCreate, canDelete, canRead },
  } = useRBAC(adminPermissions.settings.users);
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { search } = useLocation();
  useFocusWhenNavigate();
  useLicenseLimitNotification();
  const {
    users,
    pagination,
    isError,
    isLoading,
    refetchQueries: refetchAdminUsers,
  } = useAdminUsers(qs.parse(search, { ignoreQueryPrefix: true }), {
    enabled: canRead,
  });

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  const title = formatMessage({
    id: 'global.users',
    defaultMessage: 'Users',
  });

  const handleToggle = () => {
    setIsModalOpen((prev) => !prev);
  };

  const deleteAllMutation = useMutation(
    async (ids) => {
      await post('/admin/users/batch-delete', { ids });
    },
    {
      async onSuccess() {
        await refetchAdminUsers();

        // Toggle enabled/ disabled state on the invite button
        await queryClient.refetchQueries(EE_LICENSE_LIMIT_QUERY_KEY);
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: {
            id: 'notification.error',
            message: formatAPIError(error),
            defaultMessage: 'An error occured',
          },
        });
      },
    }
  );

  return (
    <Main aria-busy={isLoading}>
      <SettingsPageTitle name="Users" />
      <HeaderLayout
        primaryAction={canCreate && <CreateAction onClick={handleToggle} />}
        title={title}
        subtitle={formatMessage({
          id: 'Settings.permissions.users.listview.header.subtitle',
          defaultMessage: 'All the users who have access to the Strapi admin panel',
        })}
      />
      {canRead && (
        <ActionLayout
          startActions={
            <>
              <SearchURLQuery
                label={formatMessage(
                  { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                  { target: title }
                )}
              />
              <Filters displayedFilters={displayedFilters} />
            </>
          }
        />
      )}

      <ContentLayout canRead={canRead}>
        {!canRead && <NoPermissions />}
        {/* TODO: Replace error message with something better */}
        {isError && <div>TODO: An error occurred</div>}
        {canRead && (
          <>
            <DynamicTable
              contentType="Users"
              isLoading={isLoading}
              onConfirmDeleteAll={deleteAllMutation.mutateAsync}
              onConfirmDelete={(id) => deleteAllMutation.mutateAsync([id])}
              headers={headers}
              rows={users}
              withBulkActions
              withMainAction={canDelete}
            >
              <TableRows
                canDelete={canDelete}
                headers={headers}
                rows={users}
                withBulkActions
                withMainAction={canDelete}
              />
            </DynamicTable>

            {pagination && <PaginationFooter pagination={pagination} />}
          </>
        )}
      </ContentLayout>
      {isModalOpened && (
        <ModalForm
          onSuccess={async () => {
            await refetchAdminUsers();
            await queryClient.refetchQueries(EE_LICENSE_LIMIT_QUERY_KEY);
          }}
          onToggle={handleToggle}
        />
      )}
    </Main>
  );
};

export default ListPage;
