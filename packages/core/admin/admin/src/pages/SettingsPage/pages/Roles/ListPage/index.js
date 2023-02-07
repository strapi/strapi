import React, { useCallback, useState } from 'react';
import matchSorter from 'match-sorter';
import {
  SettingsPageTitle,
  useQuery,
  useTracking,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import Plus from '@strapi/icons/Plus';
import Trash from '@strapi/icons/Trash';
import Pencil from '@strapi/icons/Pencil';
import Duplicate from '@strapi/icons/Duplicate';
import { Button } from '@strapi/design-system/Button';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { Table, Tbody, Th, Thead, Tr, TFooter } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { Main } from '@strapi/design-system/Main';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
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
    (id) => {
      push(`/settings/roles/${id}`);
    },
    [push]
  );

  const handleToggle = useCallback(() => {
    setIsModalOpen((prev) => !prev);
  }, []);

  const handleToggleModalForCreatingRole = useCallback(() => {
    trackUsage('didShowRBACUpgradeModal');
    setIsModalOpen(true);
  }, [trackUsage]);

  const getIcons = useCallback(
    (role) => [
      {
        onClick: handleToggle,
        label: formatMessage({ id: 'app.utils.duplicate', defaultMessage: 'Duplicate' }),
        icon: <Duplicate />,
      },
      {
        onClick: () => handleGoTo(role.id),
        label: formatMessage({ id: 'app.utils.edit', defaultMessage: 'Edit' }),
        icon: <Pencil />,
      },
      {
        onClick: handleToggle,
        label: formatMessage({ id: 'global.delete', defaultMessage: 'Delete' }),
        icon: <Trash />,
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
  useFocusWhenNavigate();

  const { sortedRoles, isLoading } = useSortedRoles();
  const { isModalOpen, handleToggle, handleToggleModalForCreatingRole, getIcons } =
    useRoleActions();

  const rowCount = sortedRoles.length + 1;
  const colCount = 5;

  // ! TODO - Add the search input

  return (
    <Main>
      <SettingsPageTitle name="Roles" />
      <HeaderLayout
        primaryAction={
          <Button onClick={handleToggleModalForCreatingRole} startIcon={<Plus />} size="S">
            {formatMessage({
              id: 'Settings.roles.list.button.add',
              defaultMessage: 'Add new role',
            })}
          </Button>
        }
        title={formatMessage({
          id: 'global.roles',
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
            <TFooter onClick={handleToggleModalForCreatingRole} icon={<Plus />}>
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
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: 'global.name',
                    defaultMessage: 'Name',
                  })}
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
          <Tbody>
            {sortedRoles?.map((role, rowIndex) => (
              <RoleRow
                key={role.id}
                id={role.id}
                name={role.name}
                description={role.description}
                usersCount={role.usersCount}
                icons={getIcons(role)}
                rowIndex={rowIndex + 2}
              />
            ))}
          </Tbody>
        </Table>
        {!rowCount && !isLoading && <EmptyRole />}
      </ContentLayout>
      <UpgradePlanModal isOpen={isModalOpen} onClose={handleToggle} />
    </Main>
  );
};

export default RoleListPage;
