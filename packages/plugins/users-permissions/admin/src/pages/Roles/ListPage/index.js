import React, { useMemo } from 'react';
import {
  Button,
  HeaderLayout,
  IconButton,
  Layout,
  Main,
  Table,
  Tbody,
  Text,
  Tr,
  Td,
  Thead,
  Th,
  TableLabel,
  useNotifyAT,
  ContentLayout,
  ActionLayout,
  VisuallyHidden,
} from '@strapi/parts';
import { AddIcon, EditIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import {
  useTracking,
  SettingsPageTitle,
  CheckPermissions,
  useNotification,
  useRBAC,
  NoPermissions,
  LoadingIndicatorPage,
  Search,
  useQueryParams,
  EmptyStateLayout,
} from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import { useQuery } from 'react-query';
import matchSorter from 'match-sorter';

import { fetchData } from './utils/api';
import { getTrad } from '../../../utils';
import pluginId from '../../../pluginId';
import permissions from '../../../permissions';

const RoleListPage = () => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const toggleNotification = useNotification();
  const { notifyStatus } = useNotifyAT();
  const [{ query }] = useQueryParams();
  const _q = query?._q || '';

  const updatePermissions = useMemo(() => {
    return {
      create: permissions.createRole,
      read: permissions.readRoles,
      update: permissions.updateRole,
      delete: permissions.deleteRole,
    };
  }, []);

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canRead },
  } = useRBAC(updatePermissions);

  const {
    isLoading: isLoadingForData,
    data: { roles },
    isFetching,
  } = useQuery('get-roles', () => fetchData(toggleNotification, notifyStatus), {
    initialData: {},
    enabled: canRead,
  });

  const isLoading = isLoadingForData || isFetching;

  const handleNewRoleClick = () => {
    trackUsage('willCreateRole');
    push(`/settings/${pluginId}/roles/new`);
  };

  const pageTitle = formatMessage({
    id: getTrad('HeaderNav.link.roles'),
    defaultMessage: 'Roles',
  });

  const handleClickEdit = id => {
    push(`/settings/${pluginId}/roles/${id}`);
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

  const sortedRoles = matchSorter(roles || [], _q, { keys: ['name', 'description'] });
  const emptyContent = _q && !sortedRoles.length ? 'search' : 'roles';

  const colCount = 4;
  const rowCount = (roles?.length || 0) + 1;

  return (
    <Layout>
      <SettingsPageTitle name={pageTitle} />
      <Main aria-busy={isLoading}>
        <HeaderLayout
          title={formatMessage({
            id: 'Settings.roles.title',
            defaultMessage: 'Roles',
          })}
          subtitle={formatMessage({
            id: 'Settings.roles.list.description',
            defaultMessage: 'List of roles',
          })}
          primaryAction={
            <CheckPermissions permissions={permissions.createRole}>
              <Button onClick={handleNewRoleClick} startIcon={<AddIcon />}>
                {formatMessage({
                  id: getTrad('List.button.roles'),
                  defaultMessage: 'Add new role',
                })}
              </Button>
            </CheckPermissions>
          }
        />
        <ContentLayout>
          <ActionLayout withPadding={false} startActions={<Search />} />
          {!canRead && <NoPermissions />}
          {(isLoading || isLoadingForPermissions) && <LoadingIndicatorPage />}
          {canRead && roles && sortedRoles?.length ? (
            <Table colCount={colCount} rowCount={rowCount}>
              <Thead>
                <Tr>
                  <Th>
                    <TableLabel>
                      {formatMessage({ id: getTrad('Roles.name'), defaultMessage: 'Name' })}
                    </TableLabel>
                  </Th>
                  <Th>
                    <TableLabel>
                      {formatMessage({
                        id: getTrad('Roles.description'),
                        defaultMessage: 'Description',
                      })}
                    </TableLabel>
                  </Th>
                  <Th>
                    <TableLabel>
                      {formatMessage({
                        id: getTrad('Roles.users'),
                        defaultMessage: 'Users',
                      })}
                    </TableLabel>
                  </Th>
                  <Th>
                    <VisuallyHidden>
                      {formatMessage({
                        id: 'components.TableHeader.actions-label',
                        defaultMessage: 'Actions',
                      })}
                    </VisuallyHidden>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedRoles?.map(role => (
                  <Tr key={role.name}>
                    <Td width="20%">
                      <Text label="name">{role.name}</Text>
                    </Td>
                    <Td width="50%">
                      <Text label="description">{role.description}</Text>
                    </Td>
                    <Td width="30%">
                      <Text label="users">
                        {`${role.nb_users} ${formatMessage({
                          id: getTrad('Roles.users'),
                          defaultMessage: 'users',
                        }).toLowerCase()}`}
                      </Text>
                    </Td>
                    <Td>
                      <CheckPermissions permissions={permissions.updateRole}>
                        <IconButton
                          onClick={() => handleClickEdit(role.id)}
                          noBorder
                          icon={<EditIcon />}
                          label="Edit"
                        />
                      </CheckPermissions>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyStateLayout content={emptyLayout[emptyContent]} />
          )}
        </ContentLayout>
      </Main>
    </Layout>
  );
};

export default RoleListPage;
