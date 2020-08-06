import React, { useCallback, useMemo } from 'react';
import { Padded } from '@buffetjs/core';

import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import ListWrapper from './ListWrapper';
import PermissionRow from './PermissionRow';

const Permissions = () => {
  const { permissions, pluginName, onSetPluginName } = useUsersPermissions();

  const handleOpenPlugin = useCallback(
    name => {
      onSetPluginName(name === pluginName ? null : name);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pluginName]
  );

  const formattedPermissions = useMemo(() => {
    return Object.values(permissions).reduce((acc, curr, index) => {
      return [...acc, { ...curr, name: Object.keys(permissions)[index] }];
    }, []);
  }, [permissions]);

  return (
    <ListWrapper>
      <Padded left right size="sm">
        {formattedPermissions.map((permission, index) => (
          <PermissionRow
            key={permission.name}
            isWhite={index % 2 === 1}
            onOpenPlugin={() => handleOpenPlugin(permission.name)}
            openedPlugin={pluginName}
            permissions={permission}
          />
        ))}
      </Padded>
    </ListWrapper>
  );
};

export default Permissions;
