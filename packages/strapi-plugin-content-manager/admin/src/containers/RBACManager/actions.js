import { RESET_PERMISSIONS, SET_PERMISSIONS } from './constants';

export const setPermissions = (permissions, pluginOptions, containerName) => {
  return {
    type: SET_PERMISSIONS,
    permissions,
    __meta__: {
      pluginOptions,
      containerName,
    },
  };
};

export const resetPermissions = () => ({ type: RESET_PERMISSIONS });
