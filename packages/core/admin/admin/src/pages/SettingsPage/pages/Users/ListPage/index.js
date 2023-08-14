import React, { useState } from 'react';

import { ActionLayout, ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import {
  DynamicTable,
  NoPermissions,
  SearchURLQuery,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useRBAC,
} from '@strapi/helper-plugin';
import qs from 'qs';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useAdminUsers } from '../../../../../hooks/useAdminUsers';
import { useEnterprise } from '../../../../../hooks/useEnterprise';
import { selectAdminPermissions } from '../../../../App/selectors';
import Filters from '../../../components/Filters';

import { CreateActionCE } from './CreateAction';
import TableRows from './DynamicTable/TableRows';
import ModalForm from './ModalForm';
import PaginationFooter from './PaginationFooter';
import displayedFilters from './utils/displayedFilters';
import tableHeaders from './utils/tableHeaders';

const EE_LICENSE_LIMIT_QUERY_KEY = ['ee', 'license-limit-info'];

export const UserListPageCE = () => {
  const { post } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const [isModalOpened, setIsModalOpen] = useState(false);
  const permissions = useSelector(selectAdminPermissions);
  const {
    allowedActions: { canCreate, canDelete, canRead },
  } = useRBAC(permissions.settings.users);
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { search } = useLocation();
  useFocusWhenNavigate();
  const {
    users,
    pagination,
    isError,
    isLoading,
    refetch: refetchAdminUsers,
  } = useAdminUsers(qs.parse(search, { ignoreQueryPrefix: true }), {
    cacheTime: 0,
    enabled: canRead,
  });
  const CreateAction = useEnterprise(
    CreateActionCE,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/pages/SettingsPage/pages/Users/ListPage/CreateAction'
        )
      ).CreateActionEE
  );

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

  // block rendering until the EE component is fully loaded
  if (!CreateAction) {
    return null;
  }

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

// component which determines whether this page should render the CE or EE page
const UsersListPageSwitch = () => {
  const UsersListPage = useEnterprise(
    UserListPageCE,
    async () =>
      // eslint-disable-next-line import/no-cycle
      (await import('../../../../../../../ee/admin/pages/SettingsPage/pages/Users/ListPage'))
        .UserListPageEE
  );

  // block rendering until the EE component is fully loaded
  if (!UsersListPage) {
    return null;
  }

  return <UsersListPage />;
};

export default UsersListPageSwitch;
