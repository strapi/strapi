import React, { useState } from 'react';

import {
  ActionLayout,
  Button,
  ContentLayout,
  HeaderLayout,
  Layout,
  Main,
  Table,
  Th,
  Thead,
  Tr,
  Typography,
  useNotifyAT,
  VisuallyHidden,
} from '@strapi/design-system';
import {
  CheckPermissions,
  ConfirmDialog,
  EmptyStateLayout,
  LoadingIndicatorPage,
  NoPermissions,
  SearchURLQuery,
  SettingsPageTitle,
  useCollator,
  useFilter,
  useFocusWhenNavigate,
  useNotification,
  useQueryParams,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';

import { PERMISSIONS } from '../../../constants';
import pluginId from '../../../pluginId';
import { getTrad } from '../../../utils';

import TableBody from './components/TableBody';
import { deleteData, fetchData } from './utils/api';

const RoleListPage = () => {
  const { trackUsage } = useTracking();
  const { formatMessage, locale } = useIntl();
  const { push } = useHistory();
  const toggleNotification = useNotification();
  const { notifyStatus } = useNotifyAT();
  const [{ query }] = useQueryParams();
  const _q = query?._q || '';
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState();
  useFocusWhenNavigate();

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canRead, canDelete },
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
  } = useQuery('get-roles', () => fetchData(toggleNotification, notifyStatus), {
    initialData: {},
    enabled: canRead,
  });

  const { includes } = useFilter(locale, {
    sensitivity: 'base',
  });

  /**
   * @type {Intl.Collator}
   */
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const isLoading = isLoadingForData || isFetching;

  const handleNewRoleClick = () => {
    trackUsage('willCreateRole');
    push(`/settings/${pluginId}/roles/new`);
  };

  const handleShowConfirmDelete = () => {
    setShowConfirmDelete(!showConfirmDelete);
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

  const deleteMutation = useMutation((id) => deleteData(id, toggleNotification), {
    async onSuccess() {
      await refetch();
    },
  });

  const handleConfirmDelete = async () => {
    setIsConfirmButtonLoading(true);
    await deleteMutation.mutateAsync(roleToDelete);
    setShowConfirmDelete(!showConfirmDelete);
    setIsConfirmButtonLoading(false);
  };

  const sortedRoles = (roles || [])
    .filter((role) => includes(role.name, _q) || includes(role.description, _q))
    .sort(
      (a, b) => formatter.compare(a.name, b.name) || formatter.compare(a.description, b.description)
    );

  const emptyContent = _q && !sortedRoles.length ? 'search' : 'roles';

  const colCount = 4;
  const rowCount = (roles?.length || 0) + 1;

  return (
    <Layout>
      <SettingsPageTitle name={pageTitle} />
      <Main aria-busy={isLoading}>
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
            <CheckPermissions permissions={PERMISSIONS.createRole}>
              <Button onClick={handleNewRoleClick} startIcon={<Plus />} size="S">
                {formatMessage({
                  id: getTrad('List.button.roles'),
                  defaultMessage: 'Add new role',
                })}
              </Button>
            </CheckPermissions>
          }
        />

        <ActionLayout
          startActions={
            <SearchURLQuery
              label={formatMessage({
                id: 'app.component.search.label',
                defaultMessage: 'Search',
              })}
            />
          }
        />

        <ContentLayout>
          {!canRead && <NoPermissions />}
          {(isLoading || isLoadingForPermissions) && <LoadingIndicatorPage />}
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
                permissions={PERMISSIONS}
                setRoleToDelete={setRoleToDelete}
                onDelete={[showConfirmDelete, setShowConfirmDelete]}
              />
            </Table>
          ) : (
            <EmptyStateLayout content={emptyLayout[emptyContent]} />
          )}
        </ContentLayout>
        <ConfirmDialog
          isConfirmButtonLoading={isConfirmButtonLoading}
          onConfirm={handleConfirmDelete}
          onToggleDialog={handleShowConfirmDelete}
          isOpen={showConfirmDelete}
        />
      </Main>
    </Layout>
  );
};

export default RoleListPage;
