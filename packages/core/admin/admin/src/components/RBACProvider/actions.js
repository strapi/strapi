import { RESET_STORE, SET_PERMISSIONS } from './constants';

const resetStore = () => ({ type: RESET_STORE });

const setPermissions = (permissions) => ({
  type: SET_PERMISSIONS,
  permissions,
});

export { resetStore, setPermissions };
