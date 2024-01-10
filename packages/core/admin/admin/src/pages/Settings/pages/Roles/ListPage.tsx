import * as React from 'react';

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
  CheckPagePermissions,
} from '@strapi/helper-plugin';
import { Duplicate, Pencil, Plus, Trash } from '@strapi/icons';
import { AxiosError } from 'axios';
import produce from 'immer';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { useTypedSelector } from '../../../../core/store/hooks';
import { useAdminRoles, AdminRole } from '../../../../hooks/useAdminRoles';
import { selectAdminPermissions } from '../../../../selectors';

import { RoleRow, RoleRowProps } from './components/RoleRow';

const ListPage = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();
  const permissions = useTypedSelector(selectAdminPermissions);
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const [isWarningDeleteAllOpened, setIsWarningDeleteAllOpenend] = React.useState(false);
  const [{ query }] = useQueryParams<{ _q?: string }>();
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canCreate, canDelete, canRead, canUpdate },
  } = useRBAC(permissions.settings?.roles);

  const { roles, refetch: refetchRoles } = useAdminRoles(
    { filters: query?._q ? { name: { $containsi: query._q } } : undefined },
    {
      refetchOnMountOrArgChange: true,
      skip: isLoadingForPermissions || !canRead,
    }
  );

  const { push } = useHistory();
  const [{ showModalConfirmButtonLoading, roleToDelete }, dispatch] = React.useReducer(
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
      if (error instanceof AxiosError) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      }
    }
    handleToggleModal();
  };

  const handleNewRoleClick = () => push('/settings/roles/new');

  const handleToggleModal = () => setIsWarningDeleteAllOpenend((prev) => !prev);

  const handleClickDelete = (role: AdminRole) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (role.usersCount) {
      toggleNotification({
        type: 'info',
        message: { id: 'Roles.ListPage.notification.delete-not-allowed' },
      });
    } else {
      dispatch({
        type: 'SET_ROLE_TO_DELETE',
        id: role.id,
      });

      handleToggleModal();
    }
  };

  const handleClickDuplicate = (role: AdminRole) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    push(`/settings/roles/duplicate/${role.id}`);
  };

  const rowCount = roles.length + 1;
  const colCount = 6;

  if (isLoadingForPermissions) {
    return (
      <Main>
        <LoadingIndicatorPage />
      </Main>
    );
  }

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
        title={formatMessage({
          id: 'global.roles',
          defaultMessage: 'roles',
        })}
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
                {
                  target: formatMessage({
                    id: 'global.roles',
                    defaultMessage: 'roles',
                  }),
                }
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
                <RoleRow
                  key={role.id}
                  id={role.id}
                  name={role.name}
                  description={role.description}
                  usersCount={role.usersCount}
                  icons={
                    [
                      canCreate &&
                        ({
                          onClick: handleClickDuplicate(role),
                          label: formatMessage({
                            id: 'app.utils.duplicate',
                            defaultMessage: 'Duplicate',
                          }),
                          icon: <Duplicate />,
                        } satisfies RoleRowProps['icons'][number]),
                      canUpdate &&
                        ({
                          onClick: () => push(`/settings/roles/${role.id}`),
                          label: formatMessage({ id: 'app.utils.edit', defaultMessage: 'Edit' }),
                          icon: <Pencil />,
                        } satisfies RoleRowProps['icons'][number]),
                      canDelete &&
                        ({
                          onClick: handleClickDelete(role),
                          label: formatMessage({ id: 'global.delete', defaultMessage: 'Delete' }),
                          icon: <Trash />,
                        } satisfies RoleRowProps['icons'][number]),
                    ].filter(Boolean) as RoleRowProps['icons']
                  }
                  rowIndex={index + 2}
                  canUpdate={canUpdate}
                />
              ))}
            </Tbody>
          </Table>
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

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

/**
 * TODO: do we actually need this reducer? It's not doing a lot...
 */

interface State {
  roleToDelete: null | AdminRole['id'];
  showModalConfirmButtonLoading: boolean;
  shouldRefetchData: boolean;
}

const initialState = {
  roleToDelete: null,
  showModalConfirmButtonLoading: false,
  shouldRefetchData: false,
} satisfies State;

interface SetRoleToDeleteAction extends Pick<AdminRole, 'id'> {
  type: 'SET_ROLE_TO_DELETE';
}

interface ResetDataToDeleteAction {
  type: 'RESET_DATA_TO_DELETE';
}

interface OnRemoveRolesAction {
  type: 'ON_REMOVE_ROLES';
}

interface OnRemoveRolesSucceededAction {
  type: 'ON_REMOVE_ROLES_SUCCEEDED';
}

type Action =
  | SetRoleToDeleteAction
  | ResetDataToDeleteAction
  | OnRemoveRolesAction
  | OnRemoveRolesSucceededAction;

const reducer = (state: State, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ON_REMOVE_ROLES': {
        draftState.showModalConfirmButtonLoading = true;
        break;
      }
      case 'ON_REMOVE_ROLES_SUCCEEDED': {
        draftState.shouldRefetchData = true;
        draftState.roleToDelete = null;
        break;
      }
      case 'RESET_DATA_TO_DELETE': {
        draftState.shouldRefetchData = false;
        draftState.roleToDelete = null;
        draftState.showModalConfirmButtonLoading = false;
        break;
      }
      case 'SET_ROLE_TO_DELETE': {
        draftState.roleToDelete = action.id;

        break;
      }
      default:
        return draftState;
    }
  });

/* -------------------------------------------------------------------------------------------------
 * ProtectedListPage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedListPage = () => {
  const permissions = useTypedSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.roles.main}>
      <ListPage />
    </CheckPagePermissions>
  );
};

export { ProtectedListPage, ListPage };
