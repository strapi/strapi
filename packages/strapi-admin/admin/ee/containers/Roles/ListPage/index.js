import React, { useEffect, useReducer, useState } from 'react';
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
} from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';

import useSettingsHeaderSearchContext from '../../../../src/hooks/useSettingsHeaderSearchContext';
import { EmptyRole, RoleListWrapper } from '../../../../src/components/Roles';
import { useRolesList } from '../../../../src/hooks';
import RoleRow from './RoleRow';
import BaselineAlignment from './BaselineAlignment';
import reducer, { initialState } from './reducer';

const RoleListPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const [isWarningDeleteAllOpened, setIsWarningDeleteAllOpenend] = useState(false);
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const [{ selectedRoles, shouldRefetchData }, dispath] = useReducer(reducer, initialState);
  const { getData, roles, isLoading } = useRolesList();
  const { toggleHeaderSearch } = useSettingsHeaderSearchContext();
  const query = useQuery();
  const _q = decodeURIComponent(query.get('_q') || '');
  const results = matchSorter(roles, _q, { keys: ['name', 'description'] });

  useEffect(() => {
    toggleHeaderSearch({ id: 'Settings.permissions.menu.link.roles.label' });

    return () => {
      toggleHeaderSearch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const filteredRoles = selectedRoles.filter(currentId => {
        const currentRole = roles.find(role => role.id === currentId);

        return currentRole.usersCount === 0;
      });

      if (selectedRoles.length !== filteredRoles.length) {
        strapi.notification.info('Roles.ListPage.notification.delete-all-not-allowed');
      }

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
    } catch (err) {
      console.error(err);
      strapi.notification.error('notification.error');
    } finally {
      handleToggleModal();
    }
  };

  const handleDuplicateRole = () => console.log('duplicate');

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

  const headerActions = [
    {
      label: formatMessage({
        id: 'Settings.roles.list.button.add',
      }),
      onClick: handleNewRoleClick,
      color: 'primary',
      type: 'button',
      icon: true,
    },
  ];

  const resultsCount = results.length;

  return (
    <>
      <Header
        title={{
          label: formatMessage({
            id: 'Settings.roles.title',
          }),
        }}
        content={formatMessage({
          id: 'Settings.roles.list.description',
        })}
        actions={headerActions}
        isLoading={isLoading}
      />
      <BaselineAlignment />
      <RoleListWrapper>
        <List
          title={formatMessage(
            {
              id: `Settings.roles.list.title${resultsCount > 1 ? '.plural' : '.singular'}`,
            },
            { number: resultsCount }
          )}
          isLoading={isLoading}
          button={{
            color: 'delete',
            disabled: selectedRoles.length === 0,
            label: formatMessage({ id: 'app.utils.delete' }),
            onClick: handleToggleModal,
            type: 'button',
          }}
          items={results}
          customRowComponent={role => (
            <RoleRow
              selectedRoles={selectedRoles}
              onRoleDuplicate={handleDuplicateRole}
              onRoleRemove={handleRemoveRole}
              onRoleToggle={handleRoleToggle}
              role={role}
            />
          )}
        />
        {!resultsCount && !isLoading && <EmptyRole />}
        <ListButton>
          <Button
            onClick={handleNewRoleClick}
            icon={<Plus fill="#007eff" width="11px" height="11px" />}
            label={formatMessage({
              id: 'Settings.roles.list.button.add',
            })}
          />
        </ListButton>
      </RoleListWrapper>
      <PopUpWarning
        isOpen={isWarningDeleteAllOpened}
        onClosed={handleClosedModal}
        onConfirm={handleConfirmDeleteData}
        toggleModal={handleToggleModal}
      />
    </>
  );
};

export default RoleListPage;
