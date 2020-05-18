import React, { useEffect, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@buffetjs/core';
import { List, Header } from '@buffetjs/custom';
import { Plus } from '@buffetjs/icons';
import { useGlobalContext, ListButton, request } from 'strapi-helper-plugin';

import RoleRow from './RoleRow';
import BaselineAlignment from './BaselineAlignment';
import reducer, { initialState } from './reducer';
import { RoleListWrapper } from '../../../../src/components/Roles';

const RoleListPage = () => {
  const { settingsBaseURL, formatMessage } = useGlobalContext();
  const { push } = useHistory();
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const { roles, selectedRoles } = reducerState;

  useEffect(() => {
    fetchRoleList();
  }, []);

  const fetchRoleList = async () => {
    try {
      const { data } = await request('/admin/roles', { method: 'GET' });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewRoleClick = () => push(`${settingsBaseURL}/roles/new`);
  const handleDuplicateRole = () => console.log('duplicate');
  const handleRemoveRoles = () => console.log('remove roles');
  const handleRemoveRole = () => console.log('remove role');
  const handleRoleToggle = () => console.log('remove toggle');

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

  return (
    <>
      <Header
        icon
        title={{
          label: formatMessage({
            id: 'Settings.roles.title',
          }),
        }}
        content={formatMessage({
          id: 'Settings.roles.list.description',
        })}
        actions={headerActions}
      />
      <BaselineAlignment />
      <RoleListWrapper>
        <List
          title={`${roles.length} ${formatMessage({
            id: 'Settings.roles.title',
          })}`}
          button={{
            color: 'primary',
            disabled: selectedRoles.length === 0,
            label: formatMessage({ id: 'app.utils.delete' }),
            onClick: handleRemoveRoles,
            type: 'button',
          }}
          items={roles}
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
    </>
  );
};

export default RoleListPage;
