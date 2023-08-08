import { RESET_PERMISSIONS, SET_PERMISSIONS } from './constants';

export const setPermissions = (permissions, plugins, containerName) => {
  return {
    type: SET_PERMISSIONS,
    permissions,
    __meta__: {
      plugins,
      containerName,
    },
  };
};

export const resetPermissions = () => ({ type: RESET_PERMISSIONS });
