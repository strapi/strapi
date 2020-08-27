import React, { useCallback, useReducer } from 'react';
import { Padded } from '@buffetjs/core';
import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import ListWrapper from './ListWrapper';
import PermissionRow from './PermissionRow';
import init from './init';
import { initialState, reducer } from './reducer';

const Permissions = () => {
  const { permissions } = useUsersPermissions();
  const [{ collapses }, dispatch] = useReducer(reducer, initialState, state =>
    init(state, permissions)
  );

  const handleOpenPlugin = useCallback(index => {
    dispatch({
      type: 'TOGGLE_COLLAPSE',
      index,
    });
  }, []);

  return (
    <ListWrapper>
      <Padded left right size="sm">
        {collapses.map((_, index) => {
          const { isOpen, name } = collapses[index];

          return (
            <PermissionRow
              key={name}
              isOpen={isOpen}
              isWhite={index % 2 === 1}
              name={name}
              onOpenPlugin={() => handleOpenPlugin(index)}
              permissions={permissions[name]}
            />
          );
        })}
      </Padded>
    </ListWrapper>
  );
};

export default Permissions;
