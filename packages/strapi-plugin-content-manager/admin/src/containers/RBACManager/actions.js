import { RESET_PERMISSIONS, SET_PERMISSIONS } from './constants';

export const setPermissions = permissions => {
  return {
    type: SET_PERMISSIONS,
    permissions,
  };
};

export const resetPermissions = () => ({ type: RESET_PERMISSIONS });
