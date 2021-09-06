import { SettingsPageTitle, useQuery, useTracking } from '@strapi/helper-plugin';
import { AddIcon, DeleteIcon, EditIcon, Duplicate } from '@strapi/icons';
import {
  Button,
  ContentLayout,
  HeaderLayout,
  Table,
  TableLabel,
  Tbody,
  TFooter,
  Th,
  Thead,
  Tr,
  VisuallyHidden,
  Main,
} from '@strapi/parts';
import matchSorter from 'match-sorter';
import React, { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router';
import RoleRow from './components/RoleRow';
import EmptyRole from './components/EmptyRole';
import UpgradePlanModal from '../../../../../components/UpgradePlanModal';
import { useRolesList } from '../../../../../hooks';

const useSortedRoles = () => {
  const { roles, isLoading } = useRolesList();

  const query = useQuery();
  const _q = decodeURIComponent(query.get('_q') || '');
  const sortedRoles = matchSorter(roles, _q, { keys: ['name', 'description'] });

  return { isLoading, sortedRoles };
};

const useRoleActions = () => {
  const { formatMessage } = useIntl();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { trackUsage } = useTracking();
  const { push } = useHistory();

  const handleGoTo = useCallback(
    id => {
      push(`/settings/roles/${id}`);
    },
    [push]
  );

  const handleToggle = useCallback(() => {
    setIsModalOpen(prev => !prev);
  }, []);

  const handleToggleModalForCreatingRole = useCallback(() => {
    trackUsage('didShowRBACUpgradeModal');
    setIsModalOpen(true);
  }, [trackUsage]);

  const getIcons = useCallback(
    role => [
      {
        onClick: handleToggle,
        label: formatMessage({ id: 'app.utils.duplicate', defaultMessage: 'Duplicate' }),
        icon: <Duplicate />,
      },
      {
        onClick: () => handleGoTo(role.id),
        label: formatMessage({ id: 'app.utils.edit', defaultMessage: 'Edit' }),
        icon: <EditIcon />,
      },
      {
        onClick: handleToggle,
        label: formatMessage({ id: 'app.utils.delete', defaultMessage: 'Delete' }),
        icon: <DeleteIcon />,
      },
    ],
    [formatMessage, handleToggle, handleGoTo]
  );

  return {
    isModalOpen,
    handleToggleModalForCreatingRole,
    handleToggle,
    getIcons,
  };
};

const RoleListPage = () => {
  const { formatMessage } = useIntl();

  const { sortedRoles, isLoading } = useSortedRoles();
  const {
    isModalOpen,
    handleToggle,
    handleToggleModalForCreatingRole,
    getIcons,
  } = useRoleActions();

  const rowCount = sortedRoles.length + 1;
  const colCount = 5;

  // ! TODO - Add the search input

  return (
    <Main labelledBy="title">
      <SettingsPageTitle name="Roles" />
      <HeaderLayout
        id="title"
        primaryAction={
          <Button onClick={handleToggleModalForCreatingRole} startIcon={<AddIcon />}>
            {formatMessage({
              id: 'Settings.roles.list.button.add',
              defaultMessage: 'Add new role',
            })}
          </Button>
        }
        title={formatMessage({
          id: 'Settings.roles.title',
          defaultMessage: 'roles',
        })}
        subtitle={formatMessage({
          id: 'Settings.roles.list.description',
          defaultMessage: 'List of roles',
        })}
      />
      <ContentLayout>
        <Table
          colCount={colCount}
          rowCount={rowCount}
          footer={
            <TFooter onClick={handleToggleModalForCreatingRole} icon={<AddIcon />}>
              {formatMessage({
                id: 'Settings.roles.list.button.add',
                defaultMessage: 'Add new role',
              })}
            </TFooter>
          }
        >
          <Thead>
            <Tr>
              <Th>
                <TableLabel>
                  {formatMessage({
                    id: 'Settings.roles.list.header.name',
                    defaultMessage: 'Name',
                  })}
                </TableLabel>
              </Th>
              <Th>
                <TableLabel>
                  {formatMessage({
                    id: 'Settings.roles.list.header.description',
                    defaultMessage: 'Description',
                  })}
                </TableLabel>
              </Th>
              <Th>
                <TableLabel>
                  {formatMessage({
                    id: 'Settings.roles.list.header.users',
                    defaultMessage: 'Users',
                  })}
                </TableLabel>
              </Th>
              <Th>
                <VisuallyHidden>
                  {formatMessage({
                    id: 'Settings.roles.list.header.actions',
                    defaultMessage: 'Actions',
                  })}
                </VisuallyHidden>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedRoles?.map(role => (
              <RoleRow
                key={role.id}
                id={role.id}
                name={role.name}
                description={role.description}
                usersCount={role.usersCount}
                icons={getIcons(role)}
              />
            ))}
          </Tbody>
        </Table>
        {!rowCount && !isLoading && <EmptyRole />}
      </ContentLayout>
      <UpgradePlanModal isOpen={isModalOpen} onToggle={handleToggle} />
    </Main>
  );
};

export default RoleListPage;
