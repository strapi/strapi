import { useQuery, useTracking } from '@strapi/helper-plugin';
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
} from '@strapi/parts';
import matchSorter from 'match-sorter';
import React, { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router';
import { EmptyRole, RoleRow } from '../../../components/Roles';
import PageTitle from '../../../components/SettingsPageTitle';
import UpgradePlanModal from '../../../components/UpgradePlanModal';
import { useRolesList } from '../../../hooks';
// import adminPermissions from '../../../permissions';

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const { trackUsage } = useTracking();
  const { roles, isLoading } = useRolesList();
  // const { toggleHeaderSearch } = useSettingsHeaderSearchContext();
  const { push } = useHistory();
  // const {
  //   allowedActions: { canUpdate },
  // } = useRBAC(adminPermissions.settings.roles);
  const query = useQuery();
  const _q = decodeURIComponent(query.get('_q') || '');
  const results = matchSorter(roles, _q, { keys: ['name', 'description'] });

  // useEffect(() => {
  //   toggleHeaderSearch({ id: 'Settings.permissions.menu.link.roles.label' });

  //   return () => {
  //     toggleHeaderSearch();
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const handleGoTo = useCallback(
    id => {
      push(`/settings/roles/${id}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleToggle = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }, []);

  const handleToggleModalForCreatingRole = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    trackUsage('didShowRBACUpgradeModal');

    setIsOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowCount = results.length;
  const colCount = results.length ? Object.keys(results[0]).length : 0;

  const getIcons = useCallback(
    id => [
      {
        onClick: handleToggle,
        label: formatMessage({ id: 'app.utils.duplicate', defaultMessage: 'Duplicate' }),
        icon: <Duplicate />,
      },
      {
        onClick: () => handleGoTo(id),
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

  return (
    <>
      <PageTitle name="Roles" />
      <HeaderLayout
        primaryAction={(
          <Button onClick={handleToggleModalForCreatingRole} startIcon={<AddIcon />}>
            {formatMessage({
              id: 'Settings.roles.list.button.add',
              defaultMessage: 'Add new role',
            })}
          </Button>
        )}
        title={formatMessage({
          id: 'Settings.roles.title',
          defaultMessage: 'roles',
        })}
        subtitle={formatMessage({
          id: 'Settings.roles.list.description',
          defaultMessage: 'List of roles',
        })}
        as="h2"
      />
      <ContentLayout>
        <Table
          colCount={colCount}
          rowCount={rowCount}
          footer={(
            <TFooter onClick={handleToggleModalForCreatingRole} icon={<AddIcon />}>
              {formatMessage({
                id: 'Settings.roles.list.button.add',
                defaultMessage: 'Add new role',
              })}
            </TFooter>
          )}
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
            {results.map(role => (
              <RoleRow
                key={role.id}
                id={role.id}
                name={role.name}
                description={role.description}
                usersCount={role.usersCount}
                icons={getIcons(role.id)}
              />
            ))}
          </Tbody>
        </Table>
        {!rowCount && !isLoading && <EmptyRole />}
      </ContentLayout>
      <UpgradePlanModal isOpen={isOpen} onToggle={handleToggle} />
    </>
  );
};

export default RoleListPage;
