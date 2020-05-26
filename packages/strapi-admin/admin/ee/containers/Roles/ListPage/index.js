import React, { useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@buffetjs/core';
import { List, Header } from '@buffetjs/custom';
import { Plus } from '@buffetjs/icons';
import { useGlobalContext, ListButton } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';

import { RoleListWrapper } from '../../../../src/components/Roles';
import useRolesList from '../../../../src/hooks/useRolesList';
import RoleRow from './RoleRow';
import BaselineAlignment from './BaselineAlignment';
import reducer, { initialState } from './reducer';

const RoleListPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const [reducerState] = useReducer(reducer, initialState);
  const { selectedRoles } = reducerState;
  const { roles, isLoading } = useRolesList();

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
          isLoading={isLoading}
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
