import {
  LoadingIndicatorPage,
  PopUpWarning,
  request,
  useNotification,
  useQuery,
  useRBAC,
} from '@strapi/helper-plugin';
import { AddIcon, DeleteIcon, Duplicate, EditIcon } from '@strapi/icons';
import {
  Button,
  ContentLayout,
  HeaderLayout,
  Table,
  Tbody,
  TFooter,
  Thead,
  Th,
  Tr,
  TableLabel,
  VisuallyHidden,
  BaseCheckbox,
  Main,
} from '@strapi/parts';
import { get } from 'lodash';
import matchSorter from 'match-sorter';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { EmptyRole, RoleRow as BaseRoleRow } from '../../../../../admin/src/components/Roles';
import PageTitle from '../../../../../admin/src/components/SettingsPageTitle';
import { useRolesList } from '../../../../../admin/src/hooks';
import adminPermissions from '../../../../../admin/src/permissions';
import reducer, { initialState } from './reducer';

const useSortedRoles = () => {
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canCreate, canDelete, canRead, canUpdate },
  } = useRBAC(adminPermissions.settings.roles);
  const { getData, roles, isLoading } = useRolesList(false);
  const query = useQuery();
  const _q = decodeURIComponent(query.get('_q') || '');
  const sortedRoles = matchSorter(roles, _q, { keys: ['name', 'description'] });

  useEffect(() => {
    if (!isLoadingForPermissions && canRead) {
      getData();
    }
  }, [isLoadingForPermissions, canRead, getData]);

  return {
    isLoadingForPermissions,
    canCreate,
    canDelete,
    canRead,
    canUpdate,
    isLoading,
    getData,
    sortedRoles,
    roles,
  };
};

const useRoleActions = ({ getData, canCreate, canDelete, canUpdate, roles, sortedRoles }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const [isWarningDeleteAllOpened, setIsWarningDeleteAllOpenend] = useState(false);
  const { push } = useHistory();
  const [
    { selectedRoles, showModalConfirmButtonLoading, shouldRefetchData },
    dispatch,
  ] = useReducer(reducer, initialState);

  const handleClosedModal = () => {
    if (shouldRefetchData) {
      getData();
    }

    // Empty the selected ids when the modal closes
    dispatch({
      type: 'RESET_DATA_TO_DELETE',
    });
  };

  const handleConfirmDeleteData = async () => {
    try {
      dispatch({
        type: 'ON_REMOVE_ROLES',
      });
      const filteredRoles = selectedRoles.filter(currentId => {
        const currentRole = roles.find(role => role.id === currentId);

        return currentRole.usersCount === 0;
      });

      if (selectedRoles.length !== filteredRoles.length) {
        toggleNotification({
          type: 'info',
          message: { id: 'Roles.ListPage.notification.delete-all-not-allowed' },
        });
      }

      if (filteredRoles.length) {
        await request('/admin/roles/batch-delete', {
          method: 'POST',
          body: {
            ids: filteredRoles,
          },
        });

        // Empty the selectedRolesId and set the shouldRefetchData to true so the
        // list is updated when closing the modal
        dispatch({
          type: 'ON_REMOVE_ROLES_SUCCEEDED',
        });
      }
    } catch (err) {
      console.error(err);
      const errorIds = get(err, ['response', 'payload', 'data', 'ids'], null);

      if (errorIds && Array.isArray(errorIds)) {
        const errorsMsg = errorIds.join('\n');
        toggleNotification({
          type: 'warning',
          message: errorsMsg,
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }
    } finally {
      handleToggleModal();
    }
  };

  const onRoleDuplicate = useCallback(
    id => {
      push(`/settings/roles/duplicate/${id}`);
    },
    [push]
  );

  const handleNewRoleClick = () => push('/settings/roles/new');

  const onRoleRemove = useCallback(roleId => {
    dispatch({
      type: 'SET_ROLE_TO_DELETE',
      id: roleId,
    });

    handleToggleModal();
  }, []);

  const onRoleToggle = roleId => {
    dispatch({
      type: 'ON_SELECTION',
      id: roleId,
    });
  };

  const onAllRolesToggle = () =>
    dispatch({
      type: 'TOGGLE_ALL',
      ids: sortedRoles.map(r => r.id),
    });

  const handleToggleModal = () => setIsWarningDeleteAllOpenend(prev => !prev);

  const handleGoTo = useCallback(
    id => {
      push(`/settings/roles/${id}`);
    },
    [push]
  );

  const handleClickDelete = useCallback(
    (e, role) => {
      e.preventDefault();
      e.stopPropagation();

      if (role.usersCount) {
        toggleNotification({
          type: 'info',
          message: { id: 'Roles.ListPage.notification.delete-not-allowed' },
        });
      } else {
        onRoleRemove(role.id);
      }
    },
    [toggleNotification, onRoleRemove]
  );

  const handleClickDuplicate = useCallback(
    (e, role) => {
      e.preventDefault();
      e.stopPropagation();
      onRoleDuplicate(role.id);
    },
    [onRoleDuplicate]
  );

  const getIcons = useCallback(
    role => [
      ...(canCreate
        ? [
            {
              onClick: e => handleClickDuplicate(e, role),
              label: formatMessage({ id: 'app.utils.duplicate', defaultMessage: 'Duplicate' }),
              icon: <Duplicate />,
            },
          ]
        : []),
      ...(canUpdate
        ? [
            {
              onClick: () => handleGoTo(role.id),
              label: formatMessage({ id: 'app.utils.edit', defaultMessage: 'Edit' }),
              icon: <EditIcon />,
            },
          ]
        : []),
      ...(canDelete
        ? [
            {
              onClick: e => handleClickDelete(e, role),
              label: formatMessage({ id: 'app.utils.delete', defaultMessage: 'Delete' }),
              icon: <DeleteIcon />,
            },
          ]
        : []),
    ],
    [
      formatMessage,
      handleClickDelete,
      handleClickDuplicate,
      handleGoTo,
      canCreate,
      canUpdate,
      canDelete,
    ]
  );

  return {
    handleClosedModal,
    handleConfirmDeleteData,
    handleNewRoleClick,
    onRoleToggle,
    onAllRolesToggle,
    getIcons,
    selectedRoles,
    isWarningDeleteAllOpened,
    showModalConfirmButtonLoading,
    handleToggleModal,
  };
};

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  const {
    isLoadingForPermissions,
    canCreate,
    canRead,
    canDelete,
    canUpdate,
    isLoading,
    getData,
    sortedRoles,
    roles,
  } = useSortedRoles();

  const {
    handleClosedModal,
    handleConfirmDeleteData,
    handleNewRoleClick,
    onRoleToggle,
    onAllRolesToggle,
    getIcons,
    selectedRoles,
    isWarningDeleteAllOpened,
    showModalConfirmButtonLoading,
    handleToggleModal,
  } = useRoleActions({ getData, canCreate, canDelete, canUpdate, roles, sortedRoles });

  // ! TODO - Show the search bar only if the user is allowed to read - add the search input
  // canRead

  const rowCount = sortedRoles.length + 1;
  const colCount = 6;

  const isAllEntriesIndeterminate = selectedRoles.length
    ? selectedRoles.length !== rowCount
    : false;
  const isAllChecked = selectedRoles.length ? selectedRoles.length === rowCount : false;

  if (isLoadingForPermissions) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main labelledBy="title">
      <PageTitle name="Roles" />
      <HeaderLayout
        id="title"
        primaryAction={
          canCreate ? (
            <Button onClick={handleNewRoleClick} startIcon={<AddIcon />}>
              {formatMessage({
                id: 'Settings.roles.list.button.add',
                defaultMessage: 'Add new role',
              })}
            </Button>
          ) : null
        }
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
      {canRead && (
        <ContentLayout>
          <Table
            colCount={colCount}
            rowCount={rowCount}
            footer={
              canCreate ? (
                <TFooter onClick={handleNewRoleClick} icon={<AddIcon />}>
                  {formatMessage({
                    id: 'Settings.roles.list.button.add',
                    defaultMessage: 'Add new role',
                  })}
                </TFooter>
              ) : null
            }
          >
            <Thead>
              <Tr>
                {!!onRoleToggle && (
                  <Th>
                    <BaseCheckbox
                      aria-label="Select all entries"
                      indeterminate={isAllEntriesIndeterminate}
                      value={isAllChecked}
                      onChange={onAllRolesToggle}
                    />
                  </Th>
                )}
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
                <BaseRoleRow
                  key={role.id}
                  id={role.id}
                  onToggle={onRoleToggle}
                  isChecked={
                    selectedRoles.findIndex(selectedRoleId => selectedRoleId === role.id) !== -1
                  }
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
      )}
      <PopUpWarning
        isOpen={isWarningDeleteAllOpened}
        onClosed={handleClosedModal}
        onConfirm={handleConfirmDeleteData}
        toggleModal={handleToggleModal}
        isConfirmButtonLoading={showModalConfirmButtonLoading}
      />
    </Main>
  );
};

export default RoleListPage;
