import React, { useState } from 'react';

import {
  ActionLayout,
  ContentLayout,
  HeaderLayout,
  Layout,
  Table,
  Th,
  Thead,
  Tr,
  Typography,
  useNotifyAT,
  VisuallyHidden,
  EmptyStateLayout,
  useCollator,
  useFilter,
} from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import {
  ConfirmDialog,
  useTracking,
  Page,
  SearchInput,
  BackButton,
  useNotification,
  useQueryParams,
  useFetchClient,
  useRBAC,
} from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import { NavLink } from 'react-router-dom';

import { PERMISSIONS } from '../../../../constants';
import { getTrad } from '../../../../utils';

import TableBody from './components/TableBody';

export const RolesListPage = () => {
  const { trackUsage } = useTracking();
  const { formatMessage, locale } = useIntl();
  const { toggleNotification } = useNotification();
  const { notifyStatus } = useNotifyAT();
  const [{ query }] = useQueryParams();
  const _q = query?._q || '';
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState();
  const { del, get } = useFetchClient();

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canRead, canDelete, canCreate, canUpdate },
  } = useRBAC({
    create: PERMISSIONS.createRole,
    read: PERMISSIONS.readRoles,
    update: PERMISSIONS.updateRole,
    delete: PERMISSIONS.deleteRole,
  });

  const {
    isLoading: isLoadingForData,
    data: { roles },
    isFetching,
    refetch,
  } = useQuery('get-roles', () => fetchData(toggleNotification, formatMessage, notifyStatus), {
    initialData: {},
    enabled: canRead,
  });

  const { contains } = useFilter(locale, {
    sensitivity: 'base',
  });

  /**
   * @type {Intl.Collator}
   */
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const isLoading = isLoadingForData || isFetching || isLoadingForPermissions;

  const handleShowConfirmDelete = () => {
    setShowConfirmDelete(!showConfirmDelete);
  };

  const deleteData = async (id, formatMessage, toggleNotification) => {
    try {
      await del(`/users-permissions/roles/${id}`);
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
      });
    }
  };

  const fetchData = async (toggleNotification, formatMessage, notifyStatus) => {
    try {
      const { data } = await get('/users-permissions/roles');
      notifyStatus('The roles have loaded successfully');

      return data;
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });

      throw new Error(err);
    }
  };

  const emptyLayout = {
    roles: {
      id: getTrad('Roles.empty'),
      defaultMessage: "You don't have any roles yet.",
    },
    search: {
      id: getTrad('Roles.empty.search'),
      defaultMessage: 'No roles match the search.',
    },
  };

  const pageTitle = formatMessage({
    id: 'global.roles',
    defaultMessage: 'Roles',
  });

  const deleteMutation = useMutation((id) => deleteData(id, formatMessage, toggleNotification), {
    async onSuccess() {
      await refetch();
    },
  });

  const handleConfirmDelete = async () => {
    await deleteMutation.mutateAsync(roleToDelete);
    setShowConfirmDelete(!showConfirmDelete);
  };

  const sortedRoles = (roles || [])
    .filter((role) => contains(role.name, _q) || contains(role.description, _q))
    .sort(
      (a, b) => formatter.compare(a.name, b.name) || formatter.compare(a.description, b.description)
    );

  const emptyContent = _q && !sortedRoles.length ? 'search' : 'roles';

  const colCount = 4;
  const rowCount = (roles?.length || 0) + 1;

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Layout>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: pageTitle }
        )}
      </Page.Title>
      <Page.Main>
        <HeaderLayout
          title={formatMessage({
            id: 'global.roles',
            defaultMessage: 'Roles',
          })}
          subtitle={formatMessage({
            id: 'Settings.roles.list.description',
            defaultMessage: 'List of roles',
          })}
          primaryAction={
            canCreate ? (
              <LinkButton
                to="new"
                as={NavLink}
                onClick={() => trackUsage('willCreateRole')}
                startIcon={<Plus />}
                size="S"
              >
                {formatMessage({
                  id: getTrad('List.button.roles'),
                  defaultMessage: 'Add new role',
                })}
              </LinkButton>
            ) : null
          }
          navigationAction={<BackButton />}
        />

        <ActionLayout
          startActions={
            <SearchInput
              label={formatMessage({
                id: 'app.component.search.label',
                defaultMessage: 'Search',
              })}
            />
          }
        />

        <ContentLayout>
          {!canRead && <Page.NoPermissions />}
          {canRead && sortedRoles && sortedRoles?.length ? (
            <Table colCount={colCount} rowCount={rowCount}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: 'global.description',
                        defaultMessage: 'Description',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: 'global.users',
                        defaultMessage: 'Users',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <VisuallyHidden>
                      {formatMessage({
                        id: 'global.actions',
                        defaultMessage: 'Actions',
                      })}
                    </VisuallyHidden>
                  </Th>
                </Tr>
              </Thead>
              <TableBody
                sortedRoles={sortedRoles}
                canDelete={canDelete}
                canUpdate={canUpdate}
                permissions={PERMISSIONS}
                setRoleToDelete={setRoleToDelete}
                onDelete={[showConfirmDelete, setShowConfirmDelete]}
              />
            </Table>
          ) : (
            <EmptyStateLayout content={formatMessage(emptyLayout[emptyContent])} />
          )}
        </ContentLayout>
        <ConfirmDialog
          onConfirm={handleConfirmDelete}
          onClose={handleShowConfirmDelete}
          isOpen={showConfirmDelete}
        />
      </Page.Main>
    </Layout>
  );
};

export const ProtectedRolesListPage = () => {
  return (
    <Page.Protect permissions={PERMISSIONS.accessRoles}>
      <RolesListPage />
    </Page.Protect>
  );
};
