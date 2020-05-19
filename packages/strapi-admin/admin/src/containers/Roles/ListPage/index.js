import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@buffetjs/core';
import { List, Header } from '@buffetjs/custom';
import { Plus } from '@buffetjs/icons';
import { useGlobalContext, ListButton } from 'strapi-helper-plugin';

import RoleRow from './RoleRow';
import ListWrapper from './ListWrapper';
import BaselineAlignment from './BaselineAlignment';

const RoleListPage = () => {
  const { settingsBaseURL, formatMessage } = useGlobalContext();
  const { push } = useHistory();
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [roles] = useState([
    {
      roleId: 1,
      name: 'Super Admin',
      description:
        'This role is allowing a user to specify access etcetc and doing every things on the app',
      numberOfUsers: 2,
      isSelected: selectedRoleIds.findIndex(roleId => roleId === 1) !== -1,
    },
    {
      roleId: 2,
      name: 'Writter',
      description: 'Content writter',
      numberOfUsers: 15,
      isSelected: selectedRoleIds.findIndex(roleId => roleId === 2) !== -1,
    },
  ]);

  useEffect(() => {
    // fetchRoleList();
  }, []);

  // const fetchRoleList = async () => {
  //   try {
  //     const {data} = await request('/admin/roles', { method: 'GET' });
  //     setRoles(data);
  //   } catch (e) {
  //     console.error(e);
  //   }
  // };

  const handleRoleToggle = id => {
    const roleIndex = selectedRoleIds.findIndex(roleId => roleId === id);

    if (roleIndex === -1) {
      setSelectedRoleIds([...selectedRoleIds, id]);
    } else {
      setSelectedRoleIds(selectedRoleIds.filter(roleId => roleId !== id));
    }
  };
  const handleNewRoleClick = () => push(`${settingsBaseURL}/roles/new`);
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
      <ListWrapper>
        <List
          title="5 roles"
          button={{
            color: 'primary',
            disabled: true,
            label: formatMessage({ id: 'app.utils.delete' }),
            onClick: () => console.log('delete roles'),
            type: 'button',
          }}
          items={roles}
          customRowComponent={props => (
            <RoleRow selectedRoleIds={selectedRoleIds} onRoleToggle={handleRoleToggle} {...props} />
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
      </ListWrapper>
    </>
  );
};

export default RoleListPage;
