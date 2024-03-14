import * as React from 'react';

import {
  ActionLayout,
  ContentLayout,
  HeaderLayout,
  Main,
  Flex,
  Typography,
  Status,
} from '@strapi/design-system';
import {
  DynamicTable,
  useAPIErrorHandler,
  useFocusWhenNavigate,
  useNotification,
  useRBAC,
  TableHeader,
} from '@strapi/helper-plugin';
import * as qs from 'qs';
import { Helmet } from 'react-helmet';
import { IntlShape, MessageDescriptor, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { SanitizedAdminUser } from '../../../../../../shared/contracts/shared';
import { Filters } from '../../../../components/Filters';
import { Page } from '../../../../components/PageHelpers';
import { Pagination } from '../../../../components/Pagination';
import { SearchInput } from '../../../../components/SearchInput';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { useAdminUsers, useDeleteManyUsersMutation } from '../../../../services/users';

import { CreateActionCE } from './components/CreateActionCE';
import { ModalForm } from './components/NewUserForm';
import { TableRows } from './components/TableRows';

/* -------------------------------------------------------------------------------------------------
 * ListPageCE
 * -----------------------------------------------------------------------------------------------*/

const ListPageCE = () => {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [isModalOpened, setIsModalOpen] = React.useState(false);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const {
    allowedActions: { canCreate, canDelete },
  } = useRBAC(permissions.settings?.users);
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { search } = useLocation();
  useFocusWhenNavigate();
  const { data, isError, isLoading } = useAdminUsers(qs.parse(search, { ignoreQueryPrefix: true }));

  const { pagination, users } = data ?? {};

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

  const [deleteAll] = useDeleteManyUsersMutation();

  // block rendering until the EE component is fully loaded
  if (!CreateAction) {
    return null;
  }

  if (isError) {
    return <Page.Error />;
  }

  return (
    <Main aria-busy={isLoading}>
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Users',
          }
        )}
      />
      <HeaderLayout
        primaryAction={canCreate && <CreateAction onClick={handleToggle} />}
        title={title}
        subtitle={formatMessage({
          id: 'Settings.permissions.users.listview.header.subtitle',
          defaultMessage: 'All the users who have access to the Strapi admin panel',
        })}
      />
      <ActionLayout
        startActions={
          <>
            <SearchInput
              label={formatMessage(
                { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                { target: title }
              )}
            />
            <Filters.Root options={DISPLAYED_HEADERS}>
              <Filters.Trigger />
              <Filters.Popover />
              <Filters.List />
            </Filters.Root>
          </>
        }
      />
      <ContentLayout>
        {!isError && (
          <>
            <DynamicTable
              contentType="Users"
              isLoading={isLoading}
              onConfirmDeleteAll={async (ids) => {
                const res = await deleteAll({ ids });

                if ('error' in res) {
                  toggleNotification({
                    type: 'warning',
                    message: formatAPIError(res.error),
                  });
                }
              }}
              onConfirmDelete={async (id) => {
                const res = await deleteAll({ ids: [id] });

                if ('error' in res) {
                  toggleNotification({
                    type: 'warning',
                    message: formatAPIError(res.error),
                  });
                }
              }}
              headers={headers}
              rows={users}
              withBulkActions
              withMainAction={canDelete}
            >
              <TableRows canDelete={canDelete} />
            </DynamicTable>
            <Pagination.Root {...pagination}>
              <Pagination.PageSize />
              <Pagination.Links />
            </Pagination.Root>
          </>
        )}
      </ContentLayout>
      {isModalOpened && <ModalForm onToggle={handleToggle} />}
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
          <Status
            size="S"
            borderWidth={0}
            background="transparent"
            color="neutral800"
            variant={isActive ? 'success' : 'danger'}
          >
            {formatMessage({
              id: isActive
                ? 'Settings.permissions.users.active'
                : 'Settings.permissions.users.inactive',
              defaultMessage: isActive ? 'Active' : 'Inactive',
            })}
          </Status>
        </Flex>
      );
    },
  },
] satisfies ListPageTableHeader[];

const DISPLAYED_HEADERS = [
  {
    name: 'firstname',
    label: 'Firstname',
    type: 'string',
  },
  {
    name: 'lastname',
    label: 'Lastname',
    type: 'string',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
  },
  {
    name: 'username',
    label: 'Username',
    type: 'string',
  },
  {
    name: 'isActive',
    label: 'Active user',
    type: 'boolean',
  },
] satisfies Filters.Filter[];

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
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings?.users.read);

  return (
    <Page.Protect permissions={permissions}>
      <ListPage />
    </Page.Protect>
  );
};

export { ProtectedListPage, ListPage, ListPageCE };
export type { ListPageTableHeaderWithStringMetadataLabel as ListPageTableHeader };
