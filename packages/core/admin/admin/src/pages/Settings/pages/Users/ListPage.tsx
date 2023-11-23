import * as React from 'react';

import {
  ActionLayout,
  ContentLayout,
  HeaderLayout,
  Main,
  Flex,
  Typography,
  Box,
} from '@strapi/design-system';
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
  Status,
  PageSizeURLQuery,
  PaginationURLQuery,
  CheckPagePermissions,
  TableHeader,
} from '@strapi/helper-plugin';
import { AxiosError, AxiosResponse } from 'axios';
import * as qs from 'qs';
import { IntlShape, MessageDescriptor, useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { SanitizedAdminUser } from '../../../../../../shared/contracts/shared';
import { DeleteMany } from '../../../../../../shared/contracts/user';
import { useAdminUsers } from '../../../../hooks/useAdminUsers';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { selectAdminPermissions } from '../../../../selectors';
import { Filters } from '../../components/Filters';

import { CreateActionCE } from './components/CreateActionCE';
import { ModalForm } from './components/NewUserForm';
import { TableRows } from './components/TableRows';

/* -------------------------------------------------------------------------------------------------
 * ListPageCE
 * -----------------------------------------------------------------------------------------------*/

const EE_LICENSE_LIMIT_QUERY_KEY = ['ee', 'license-limit-info'];

const ListPageCE = () => {
  const { post } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const [isModalOpened, setIsModalOpen] = React.useState(false);
  const permissions = useSelector(selectAdminPermissions);
  const {
    allowedActions: { canCreate, canDelete, canRead },
  } = useRBAC(permissions.settings?.users);
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
          '../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/CreateActionEE'
        )
      ).CreateActionEE
  );

  const headers = TABLE_HEADERS.map((header) => ({
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

  const deleteAllMutation = useMutation<
    AxiosResponse<DeleteMany.Response>,
    AxiosError<Required<DeleteMany.Response>>,
    DeleteMany.Request['body']['ids']
  >(
    async (ids) =>
      post<DeleteMany.Response, AxiosResponse<DeleteMany.Response>, DeleteMany.Request['body']>(
        '/admin/users/batch-delete',
        { ids }
      ),
    {
      async onSuccess() {
        await refetchAdminUsers();

        // Toggle enabled/ disabled state on the invite button
        await queryClient.refetchQueries(EE_LICENSE_LIMIT_QUERY_KEY);
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
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
              {/* @ts-expect-error – TODO: fix the way filters work and are passed around, this will be a headache. */}
              <Filters displayedFilters={DISPLAYED_HEADERS} />
            </>
          }
        />
      )}

      <ContentLayout>
        {!canRead && <NoPermissions />}
        {/* TODO: Replace error message with something better */}
        {isError && <div>TODO: An error occurred</div>}
        {canRead && (
          <>
            <DynamicTable
              contentType="Users"
              isLoading={isLoading}
              onConfirmDeleteAll={async (ids) => {
                await deleteAllMutation.mutateAsync(ids);
              }}
              onConfirmDelete={async (id) => {
                await deleteAllMutation.mutateAsync([id]);
              }}
              headers={headers}
              rows={users}
              withBulkActions
              withMainAction={canDelete}
            >
              <TableRows canDelete={canDelete} />
            </DynamicTable>

            {pagination && (
              <Box paddingTop={4}>
                <Flex alignItems="flex-end" justifyContent="space-between">
                  <PageSizeURLQuery />
                  <PaginationURLQuery pagination={pagination} />
                </Flex>
              </Box>
            )}
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

interface ListPageTableHeader extends Omit<TableHeader, 'metadatas' | 'name'> {
  name: Extract<
    keyof SanitizedAdminUser,
    'firstname' | 'lastname' | 'email' | 'roles' | 'username' | 'isActive'
  >;
  cellFormatter?: (
    data: SanitizedAdminUser,
    meta: Omit<ListPageTableHeaderWithStringMetadataLabel, 'cellFormatter'> &
      Pick<IntlShape, 'formatMessage'>
  ) => React.ReactNode;
  key: string;
  metadatas: {
    label: MessageDescriptor;
  } & Omit<TableHeader['metadatas'], 'label'>;
}

interface ListPageTableHeaderWithStringMetadataLabel
  extends Omit<ListPageTableHeader, 'metadatas'> {
  metadatas: {
    label: string;
  } & Omit<ListPageTableHeader['metadatas'], 'label'>;
}

const TABLE_HEADERS = [
  {
    name: 'firstname',
    key: 'firstname',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.firstname',
        defaultMessage: 'Firstname',
      },
      sortable: true,
    },
  },
  {
    name: 'lastname',
    key: 'lastname',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.lastname',
        defaultMessage: 'Lastname',
      },
      sortable: true,
    },
  },
  {
    key: 'email',
    name: 'email',
    metadatas: {
      label: { id: 'Settings.permissions.users.email', defaultMessage: 'Email' },
      sortable: true,
    },
  },
  {
    key: 'roles',
    name: 'roles',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.roles',
        defaultMessage: 'Roles',
      },
      sortable: false,
    },
    cellFormatter({ roles }, { formatMessage }) {
      return (
        <Typography textColor="neutral800">
          {roles
            .map((role) =>
              formatMessage({
                id: `Settings.permissions.users.${role.code}`,
                defaultMessage: role.name,
              })
            )
            .join(',\n')}
        </Typography>
      );
    },
  },
  {
    key: 'username',
    name: 'username',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.username',
        defaultMessage: 'Username',
      },
      sortable: true,
    },
  },
  {
    key: 'isActive',
    name: 'isActive',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.user-status',
        defaultMessage: 'User status',
      },
      sortable: false,
    },
    cellFormatter({ isActive }, { formatMessage }) {
      return (
        <Flex>
          <Status variant={isActive ? 'success' : 'danger'} />
          <Typography textColor="neutral800">
            {formatMessage({
              id: isActive
                ? 'Settings.permissions.users.active'
                : 'Settings.permissions.users.inactive',
              defaultMessage: isActive ? 'Active' : 'Inactive',
            })}
          </Typography>
        </Flex>
      );
    },
  },
] satisfies ListPageTableHeader[];

const DISPLAYED_HEADERS = [
  {
    name: 'firstname',
    metadatas: { label: 'Firstname' },
    fieldSchema: { type: 'string' },
  },
  {
    name: 'lastname',
    metadatas: { label: 'Lastname' },
    fieldSchema: { type: 'string' },
  },
  {
    name: 'email',
    metadatas: { label: 'Email' },
    fieldSchema: { type: 'email' },
  },
  {
    name: 'username',
    metadatas: { label: 'Username' },
    fieldSchema: { type: 'string' },
  },
  {
    name: 'isActive',
    metadatas: { label: 'Active user' },
    fieldSchema: { type: 'boolean' },
  },
];

/* -------------------------------------------------------------------------------------------------
 * ListPage
 * -----------------------------------------------------------------------------------------------*/

// component which determines whether this page should render the CE or EE page
const ListPage = () => {
  const UsersListPage = useEnterprise(
    ListPageCE,
    async () =>
      // eslint-disable-next-line import/no-cycle
      (await import('../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/ListPage'))
        .UserListPageEE
  );

  // block rendering until the EE component is fully loaded
  if (!UsersListPage) {
    return null;
  }

  return <UsersListPage />;
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedListPage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedListPage = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.users.main}>
      <ListPage />
    </CheckPagePermissions>
  );
};

export { ProtectedListPage, ListPage, ListPageCE };
export type { ListPageTableHeaderWithStringMetadataLabel as ListPageTableHeader };
