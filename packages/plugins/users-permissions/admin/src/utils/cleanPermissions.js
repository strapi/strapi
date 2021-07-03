import { isEmpty } from 'lodash';

const cleanPermissions = permissions =>
  Object.keys(permissions).reduce((acc, current) => {
    const currentPermission = permissions[current].controllers;
    const cleanedControllers = Object.keys(currentPermission).reduce((acc2, curr) => {
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

export default cleanPermissions;
