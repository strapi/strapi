import * as React from 'react';

import {
  ActionLayout,
  ContentLayout,
  HeaderLayout,
  Flex,
  Typography,
  Status,
  IconButton,
} from '@strapi/design-system';
import { Pencil, Trash } from '@strapi/icons';
import * as qs from 'qs';
import { MessageDescriptor, useIntl } from 'react-intl';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { SanitizedAdminUser } from '../../../../../../shared/contracts/shared';
import { Filters } from '../../../../components/Filters';
import { Page } from '../../../../components/PageHelpers';
import { Pagination } from '../../../../components/Pagination';
import { SearchInput } from '../../../../components/SearchInput';
import { Table } from '../../../../components/Table';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { useRBAC } from '../../../../hooks/useRBAC';
import { useAdminUsers, useDeleteManyUsersMutation } from '../../../../services/users';
import { getDisplayName } from '../../../../utils/users';

import { CreateActionCE } from './components/CreateActionCE';
import { ModalForm } from './components/NewUserForm';

/* -------------------------------------------------------------------------------------------------
 * ListPageCE
 * -----------------------------------------------------------------------------------------------*/

const ListPageCE = () => {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [isModalOpened, setIsModalOpen] = React.useState(false);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const {
    allowedActions: { canCreate, canDelete, canRead },
  } = useRBAC(permissions.settings?.users);
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { search } = useLocation();
  const { data, isError, isLoading } = useAdminUsers(qs.parse(search, { ignoreQueryPrefix: true }));

  const { pagination, users = [] } = data ?? {};

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
    label: formatMessage(header.label),
  }));

  const title = formatMessage({
    id: 'global.users',
    defaultMessage: 'Users',
  });

  const handleToggle = () => {
    setIsModalOpen((prev) => !prev);
  };

  const [deleteAll] = useDeleteManyUsersMutation();
  const handleDeleteAll = async (ids: Array<SanitizedAdminUser['id']>) => {
    try {
      const res = await deleteAll({ ids });

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });
      }
    } catch (err) {
      console.error(err);
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'global.error',
          defaultMessage: 'An error occurred',
        }),
      });
    }
  };

  const handleRowClick = (id: SanitizedAdminUser['id']) => () => {
    if (canRead) {
      navigate(id.toString());
    }
  };

  const handleDeleteClick = (id: SanitizedAdminUser['id']) => async () =>
    await handleDeleteAll([id]);

  // block rendering until the EE component is fully loaded
  if (!CreateAction) {
    return null;
  }

  if (isError) {
    return <Page.Error />;
  }

  return (
    <Page.Main aria-busy={isLoading}>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Users',
          }
        )}
      </Page.Title>
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
            <Filters.Root options={FILTERS}>
              <Filters.Trigger />
              <Filters.Popover />
              <Filters.List />
            </Filters.Root>
          </>
        }
      />
      <ContentLayout>
        <Table.Root rows={users} headers={headers}>
          <Table.ActionBar />
          <Table.Content>
            <Table.Head>
              {canDelete ? <Table.HeaderCheckboxCell /> : null}
              {headers.map((header) => (
                <Table.HeaderCell key={header.name} {...header} />
              ))}
            </Table.Head>
            <Table.Empty />
            <Table.Loading />
            <Table.Body>
              {users.map((user) => (
                <Table.Row
                  key={user.id}
                  onClick={handleRowClick(user.id)}
                  cursor={canRead ? 'pointer' : 'default'}
                >
                  {canDelete ? <Table.CheckboxCell id={user.id} /> : null}
                  {headers.map(({ cellFormatter, name, ...rest }) => {
                    return (
                      <Table.Cell key={name}>
                        {typeof cellFormatter === 'function' ? (
                          cellFormatter(user, { name, ...rest })
                        ) : (
                          // @ts-expect-error – name === "roles" has the data value of `AdminRole[]` but the header has a cellFormatter value so this shouldn't be called.
                          <Typography textColor="neutral800">{user[name] || '-'}</Typography>
                        )}
                      </Table.Cell>
                    );
                  })}
                  {canRead || canDelete ? (
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Flex justifyContent="end">
                        {canRead ? (
                          <IconButton
                            tag={NavLink}
                            to={user.id.toString()}
                            label={formatMessage(
                              { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                              { target: getDisplayName(user) }
                            )}
                            noBorder
                            icon={<Pencil />}
                          />
                        ) : null}
                        {canDelete ? (
                          <IconButton
                            onClick={handleDeleteClick(user.id)}
                            label={formatMessage(
                              { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                              { target: getDisplayName(user) }
                            )}
                            noBorder
                            icon={<Trash />}
                          />
                        ) : null}
                      </Flex>
                    </Table.Cell>
                  ) : null}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.Root>
        <Pagination.Root {...pagination}>
          <Pagination.PageSize />
          <Pagination.Links />
        </Pagination.Root>
      </ContentLayout>
      {isModalOpened && <ModalForm onToggle={handleToggle} />}
    </Page.Main>
  );
};

const TABLE_HEADERS: Array<
  Omit<Table.Header<SanitizedAdminUser, any>, 'label'> & { label: MessageDescriptor }
> = [
  {
    name: 'firstname',
    label: {
      id: 'Settings.permissions.users.firstname',
      defaultMessage: 'Firstname',
    },
    sortable: true,
  },
  {
    name: 'lastname',
    label: {
      id: 'Settings.permissions.users.lastname',
      defaultMessage: 'Lastname',
    },
    sortable: true,
  },
  {
    name: 'email',
    label: { id: 'Settings.permissions.users.email', defaultMessage: 'Email' },
    sortable: true,
  },
  {
    name: 'roles',
    label: {
      id: 'Settings.permissions.users.roles',
      defaultMessage: 'Roles',
    },
    sortable: false,
    cellFormatter({ roles }) {
      return (
        <Typography textColor="neutral800">{roles.map((role) => role.name).join(',\n')}</Typography>
      );
    },
  },
  {
    name: 'username',
    label: {
      id: 'Settings.permissions.users.username',
      defaultMessage: 'Username',
    },
    sortable: true,
  },
  {
    name: 'isActive',
    label: {
      id: 'Settings.permissions.users.user-status',
      defaultMessage: 'User status',
    },
    sortable: false,
    cellFormatter({ isActive }) {
      return (
        <Flex>
          <Status
            size="S"
            borderWidth={0}
            background="transparent"
            color="neutral800"
            variant={isActive ? 'success' : 'danger'}
          >
            <Typography>{isActive ? 'Active' : 'Inactive'}</Typography>
          </Status>
        </Flex>
      );
    },
  },
];

const FILTERS = [
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
