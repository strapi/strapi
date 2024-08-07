import * as React from 'react';

import {
  Button,
  Dialog,
  Table,
  Tbody,
  TFooter,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Duplicate, Pencil, Plus, Trash } from '@strapi/icons';
import { produce } from 'immer';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { SearchInput } from '../../../../components/SearchInput';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useAdminRoles, AdminRole } from '../../../../hooks/useAdminRoles';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useFetchClient } from '../../../../hooks/useFetchClient';
import { useQueryParams } from '../../../../hooks/useQueryParams';
import { useRBAC } from '../../../../hooks/useRBAC';
import { selectAdminPermissions } from '../../../../selectors';
import { isFetchError } from '../../../../utils/getFetchClient';

import { RoleRow, RoleRowProps } from './components/RoleRow';

const ListPage = () => {
  const { formatMessage } = useIntl();
  const permissions = useTypedSelector(selectAdminPermissions);
  const { formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();
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

  const navigate = useNavigate();
  const [{ roleToDelete }, dispatch] = React.useReducer(reducer, initialState);
  const { post } = useFetchClient();

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
      if (isFetchError(error)) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(error),
        });
      }
    }
  };

  const handleNewRoleClick = () => navigate('new');

  const handleToggleModal = () => setIsWarningDeleteAllOpenend((prev) => !prev);

  const handleClickDelete = (role: AdminRole) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (role.usersCount) {
      toggleNotification({
        type: 'info',
        message: formatMessage({ id: 'Roles.ListPage.notification.delete-not-allowed' }),
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

    navigate(`duplicate/${role.id}`);
  };

  const rowCount = roles.length + 1;
  const colCount = 6;

  if (isLoadingForPermissions) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Roles',
          }
        )}
      </Page.Title>
      <Layouts.Header
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
      />
      {canRead && (
        <Layouts.Action
          startActions={
            <SearchInput
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
        <Layouts.Content>
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
                          children: <Duplicate />,
                        } satisfies RoleRowProps['icons'][number]),
                      canUpdate &&
                        ({
                          onClick: () => navigate(role.id.toString()),
                          label: formatMessage({ id: 'app.utils.edit', defaultMessage: 'Edit' }),
                          children: <Pencil />,
                        } satisfies RoleRowProps['icons'][number]),
                      canDelete &&
                        ({
                          onClick: handleClickDelete(role),
                          label: formatMessage({ id: 'global.delete', defaultMessage: 'Delete' }),
                          children: <Trash />,
                        } satisfies RoleRowProps['icons'][number]),
                    ].filter(Boolean) as RoleRowProps['icons']
                  }
                  rowIndex={index + 2}
                  canUpdate={canUpdate}
                />
              ))}
            </Tbody>
          </Table>
        </Layouts.Content>
      )}
      <Dialog.Root open={isWarningDeleteAllOpened} onOpenChange={handleToggleModal}>
        <ConfirmDialog onConfirm={handleDeleteData} />
      </Dialog.Root>
    </Page.Main>
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
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings?.roles.read);

  return (
    <Page.Protect permissions={permissions}>
      <ListPage />
    </Page.Protect>
  );
};

export { ProtectedListPage, ListPage };
