import React, { useCallback, useReducer, useState } from 'react';

import {
  ActionLayout,
  Button,
  ContentLayout,
  HeaderLayout,
  Main,
  Table,
  Tbody,
  TFooter,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import {
  ConfirmDialog,
  getFetchClient,
  LoadingIndicatorPage,
  SearchURLQuery,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFocusWhenNavigate,
  useQueryParams,
  useNotification,
  useRBAC,
} from '@strapi/helper-plugin';
import { Duplicate, Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { useAdminRoles } from '../../../../../hooks/useAdminRoles';
import { selectAdminPermissions } from '../../../../App/selectors';

import EmptyRole from './components/EmptyRole';
import BaseRoleRow from './components/RoleRow';
import reducer, { initialState } from './reducer';

const useRoleActions = ({ canCreate, canDelete, canUpdate, refetchRoles }) => {
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const [isWarningDeleteAllOpened, setIsWarningDeleteAllOpenend] = useState(false);
  const { push } = useHistory();
  const [{ selectedRoles, showModalConfirmButtonLoading, roleToDelete }, dispatch] = useReducer(
    reducer,
    initialState
  );

  const { post } = getFetchClient();

  const handleDeleteData = async () => {
    try {
      dispatch({
        type: 'ON_REMOVE_ROLES',
      });

      await post('/admin/roles/batch-delete', {
        ids: [roleToDelete],
      });

      await refetchRoles();

      dispatch({
        type: 'RESET_DATA_TO_DELETE',
      });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
    handleToggleModal();
  };

  const onRoleDuplicate = useCallback(
    (id) => {
      push(`/settings/roles/duplicate/${id}`);
    },
    [push]
  );

  const handleNewRoleClick = () => push('/settings/roles/new');

  const onRoleRemove = useCallback((roleId) => {
    dispatch({
      type: 'SET_ROLE_TO_DELETE',
      id: roleId,
    });

    handleToggleModal();
  }, []);

  const handleToggleModal = () => setIsWarningDeleteAllOpenend((prev) => !prev);

  const handleGoTo = useCallback(
    (id) => {
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
    (role) => [
      ...(canCreate
        ? [
            {
              onClick: (e) => handleClickDuplicate(e, role),
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
              icon: <Pencil />,
            },
          ]
        : []),
      ...(canDelete
        ? [
            {
              onClick: (e) => handleClickDelete(e, role),
              label: formatMessage({ id: 'global.delete', defaultMessage: 'Delete' }),
              icon: <Trash />,
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
    handleNewRoleClick,
    getIcons,
    selectedRoles,
    isWarningDeleteAllOpened,
    showModalConfirmButtonLoading,
    handleToggleModal,
    handleDeleteData,
  };
};

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();
  const permissions = useSelector(selectAdminPermissions);
  const [{ query }] = useQueryParams();
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canCreate, canDelete, canRead, canUpdate },
  } = useRBAC(permissions.settings.roles);

  const {
    roles,
    isLoading,
    refetch: refetchRoles,
  } = useAdminRoles(
    { filters: query?._q ? { name: { $containsi: query._q } } : undefined },
    {
      cacheTime: 0,
      enabled: !isLoadingForPermissions && canRead,
    }
  );

  const {
    handleNewRoleClick,
    getIcons,
    isWarningDeleteAllOpened,
    showModalConfirmButtonLoading,
    handleToggleModal,
    handleDeleteData,
  } = useRoleActions({ refetchRoles, canCreate, canDelete, canUpdate });

  // ! TODO - Show the search bar only if the user is allowed to read - add the search input
  // canRead

  const rowCount = roles.length + 1;
  const colCount = 6;

  if (isLoadingForPermissions) {
    return (
      <Main>
        <LoadingIndicatorPage />
      </Main>
    );
  }

  const title = formatMessage({
    id: 'global.roles',
    defaultMessage: 'roles',
  });

  return (
    <Main>
      <SettingsPageTitle name="Roles" />
      <HeaderLayout
        primaryAction={
          canCreate ? (
            <Button onClick={handleNewRoleClick} startIcon={<Plus />} size="S">
              {formatMessage({
                id: 'Settings.roles.list.button.add',
                defaultMessage: 'Add new role',
              })}
            </Button>
          ) : null
        }
        title={title}
        subtitle={formatMessage({
          id: 'Settings.roles.list.description',
          defaultMessage: 'List of roles',
        })}
        as="h2"
      />
      {canRead && (
        <ActionLayout
          startActions={
            <SearchURLQuery
              label={formatMessage(
                { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                { target: title }
              )}
            />
          }
        />
      )}
      {canRead && (
        <ContentLayout>
          <Table
            colCount={colCount}
            rowCount={rowCount}
            footer={
              canCreate ? (
                <TFooter onClick={handleNewRoleClick} icon={<Plus />}>
                  {formatMessage({
                    id: 'Settings.roles.list.button.add',
                    defaultMessage: 'Add new role',
                  })}
                </TFooter>
              ) : null
            }
          >
            <Thead>
              <Tr aria-rowindex={1}>
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
              {roles?.map((role, index) => (
                <BaseRoleRow
                  key={role.id}
                  id={role.id}
                  name={role.name}
                  description={role.description}
                  usersCount={role.usersCount}
                  icons={getIcons(role)}
                  rowIndex={index + 2}
                  canUpdate={canUpdate}
                />
              ))}
            </Tbody>
          </Table>
          {!rowCount && !isLoading && <EmptyRole />}
        </ContentLayout>
      )}
      <ConfirmDialog
        isOpen={isWarningDeleteAllOpened}
        onConfirm={handleDeleteData}
        isConfirmButtonLoading={showModalConfirmButtonLoading}
        onToggleDialog={handleToggleModal}
      />
    </Main>
  );
};

export default RoleListPage;
