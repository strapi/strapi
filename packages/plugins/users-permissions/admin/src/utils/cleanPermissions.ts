import isEmpty from 'lodash/isEmpty';

import type { Permissions, PluginPermissions } from '../types';

/** Removes empty controllers and plugins from the permission editor tree. */
const cleanPermissions = (permissions: Permissions) =>
  Object.keys(permissions).reduce<Permissions>((acc, current) => {
    const currentPermission = permissions[current].controllers;
    const cleanedControllers = Object.keys(currentPermission).reduce<
      PluginPermissions['controllers']
    >((acc2, curr) => {
      if (isEmpty(currentPermission[curr])) {
        return acc2;
      }

      acc2[curr] = currentPermission[curr];

      return acc2;
    }, {});

    if (isEmpty(cleanedControllers)) {
      return acc;
    }

    acc[current] = { controllers: cleanedControllers };

    return acc;
  }, {});

export { cleanPermissions };
