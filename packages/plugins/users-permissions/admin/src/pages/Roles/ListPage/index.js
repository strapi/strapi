import React from 'react';
import {
  Button,
  ContentLayout,
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
} from '@strapi/parts';
import { AddIcon, EditIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import {
  useTracking,
  SettingsPageTitle,
  CheckPermissions,
  LoadingIndicatorPage,
  useNotification,
} from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import { useQuery } from 'react-query';

import { fetchData } from './utils/api';
import { getTrad } from '../../../utils';
import pluginId from '../../../pluginId';
import permissions from '../../../permissions';

const RoleListPage = () => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const toggleNotification = useNotification();

  const {
    isLoading: isLoadingForData,
    data: { roles },
    isFetching,
  } = useQuery('get-roles', () => fetchData(toggleNotification), { initialData: {} });

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

  return (
    <Layout>
      <SettingsPageTitle name={pageTitle} />
      <Main
        labelledBy={formatMessage({
          id: getTrad('HeaderNav.link.roles'),
          defaultMessage: 'Roles',
        })}
      >
        <HeaderLayout
          as="h1"
          id="roles"
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
        {isLoading ? (
          <LoadingIndicatorPage />
        ) : (
          <ContentLayout>
            <Table colCount={4}>
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
                </Tr>
              </Thead>
              <Tbody>
                {roles.map(role => (
                  <Tr key={role.name}>
                    <Td width="20%">
                      <Text>{role.name}</Text>
                    </Td>
                    <Td width="50%">
                      <Text>{role.description}</Text>
                    </Td>
                    <Td width="30%">
                      <Text>{role.nb_users} users</Text>
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
          </ContentLayout>
        )}
      </Main>
    </Layout>
  );
};

export default RoleListPage;
