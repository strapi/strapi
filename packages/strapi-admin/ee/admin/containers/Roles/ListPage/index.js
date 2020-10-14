import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@buffetjs/core';
import { List, Header } from '@buffetjs/custom';
import { Plus } from '@buffetjs/icons';
import matchSorter from 'match-sorter';
import {
  useGlobalContext,
  useQuery,
  ListButton,
  PopUpWarning,
  request,
  useUserPermissions,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import adminPermissions from '../../../../../admin/src/permissions';
import PageTitle from '../../../../../admin/src/components/SettingsPageTitle';
import useSettingsHeaderSearchContext from '../../../../../admin/src/hooks/useSettingsHeaderSearchContext';
import { EmptyRole, RoleListWrapper } from '../../../../../admin/src/components/Roles';
import { useRolesList } from '../../../../../admin/src/hooks';
import RoleRow from './RoleRow';
import BaselineAlignment from './BaselineAlignment';
import reducer, { initialState } from './reducer';

const RoleListPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const [isWarningDeleteAllOpened, setIsWarningDeleteAllOpenend] = useState(false);
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const [{ selectedRoles, showModalConfirmButtonLoading, shouldRefetchData }, dispath] = useReducer(
    reducer,
    initialState
  );
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canCreate, canDelete, canRead, canUpdate },
  } = useUserPermissions(adminPermissions.settings.roles);
  const { getData, roles, isLoading } = useRolesList(false);
  const getDataRef = useRef(getData);
  const { toggleHeaderSearch } = useSettingsHeaderSearchContext();
  const query = useQuery();
  const _q = decodeURIComponent(query.get('_q') || '');
  const results = matchSorter(roles, _q, { keys: ['name', 'description'] });

  useEffect(() => {
    // Show the search bar only if the user is allowed to read
    if (canRead) {
      toggleHeaderSearch({ id: 'Settings.permissions.menu.link.roles.label' });
    }

    return () => {
      if (canRead) {
        toggleHeaderSearch();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  useEffect(() => {
    if (!isLoadingForPermissions && canRead) {
      getDataRef.current();
    }
  }, [isLoadingForPermissions, canRead]);

  const handleClosedModal = () => {
    if (shouldRefetchData) {
      getData();
    }

    // Empty the selected ids when the modal closes
    dispath({
      type: 'RESET_DATA_TO_DELETE',
    });
  };

  const handleConfirmDeleteData = async () => {
    try {
      dispath({
        type: 'ON_REMOVE_ROLES',
      });
      const filteredRoles = selectedRoles.filter(currentId => {
        const currentRole = roles.find(role => role.id === currentId);

        return currentRole.usersCount === 0;
      });

      if (selectedRoles.length !== filteredRoles.length) {
        strapi.notification.toggle({
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
        dispath({
          type: 'ON_REMOVE_ROLES_SUCCEEDED',
        });
      }
    } catch (err) {
      console.error(err);

      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    } finally {
      handleToggleModal();
    }
  };

  const handleDuplicateRole = id => {
    push(`${settingsBaseURL}/roles/duplicate/${id}`);
  };

  const handleNewRoleClick = () => push(`${settingsBaseURL}/roles/new`);

  const handleRemoveRole = roleId => {
    dispath({
      type: 'SET_ROLE_TO_DELETE',
      id: roleId,
    });

    handleToggleModal();
  };

  const handleRoleToggle = roleId => {
    dispath({
      type: 'ON_SELECTION',
      id: roleId,
    });
  };

  const handleToggleModal = () => setIsWarningDeleteAllOpenend(prev => !prev);

  /* eslint-disable indent */
  const headerActions = canCreate
    ? [
        {
          label: formatMessage({
            id: 'Settings.roles.list.button.add',
            defaultMessage: 'Add new role',
          }),
          onClick: handleNewRoleClick,
          color: 'primary',
          type: 'button',
          icon: true,
        },
      ]
    : [];
  /* eslint-enable indent */

  const resultsCount = results.length;

  if (isLoadingForPermissions) {
    return <LoadingIndicatorPage />;
  }

  return (
    <>
      <PageTitle name="Roles" />
      <Header
        title={{
          label: formatMessage({
            id: 'Settings.roles.title',
            defaultMessage: 'roles',
          }),
        }}
        content={formatMessage({
          id: 'Settings.roles.list.description',
          defaultMessage: 'List of roles',
        })}
        actions={headerActions}
        isLoading={isLoading}
      />
      <BaselineAlignment />
      {canRead && (
        <RoleListWrapper>
          <List
            title={formatMessage(
              {
                id: `Settings.roles.list.title${resultsCount > 1 ? '.plural' : '.singular'}`,
                defaultMessage: `{number} ${resultsCount > 1 ? 'roles' : 'role'}`,
              },
              { number: resultsCount }
            )}
            isLoading={isLoading}
            /* eslint-disable indent */
            button={
              canDelete
                ? {
                    color: 'delete',
                    disabled: selectedRoles.length === 0,
                    label: formatMessage({ id: 'app.utils.delete', defaultMessage: 'Delete' }),
                    onClick: handleToggleModal,
                    type: 'button',
                  }
                : null
            }
            /* eslint-enable indent */
            items={results}
            customRowComponent={role => (
              <RoleRow
                canCreate={canCreate}
                canDelete={canDelete}
                canUpdate={canUpdate}
                selectedRoles={selectedRoles}
                onRoleDuplicate={handleDuplicateRole}
                onRoleRemove={handleRemoveRole}
                onRoleToggle={handleRoleToggle}
                role={role}
              />
            )}
          />
          {!resultsCount && !isLoading && <EmptyRole />}
          {canCreate && (
            <ListButton>
              <Button
                onClick={handleNewRoleClick}
                icon={<Plus fill="#007eff" width="11px" height="11px" />}
                label={formatMessage({
                  id: 'Settings.roles.list.button.add',
                  defaultMessage: 'Add new role',
                })}
              />
            </ListButton>
          )}
        </RoleListWrapper>
      )}
      <PopUpWarning
        isOpen={isWarningDeleteAllOpened}
        onClosed={handleClosedModal}
        onConfirm={handleConfirmDeleteData}
        toggleModal={handleToggleModal}
        isConfirmButtonLoading={showModalConfirmButtonLoading}
      />
    </>
  );
};

export default RoleListPage;
