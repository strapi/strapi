import { transformPermissionsData } from './utils';

const init = (state, permissions = []) => {
  return {
    ...state,
    selectedAction: null,
    routes: [],
    selectedActions: [],
    data: transformPermissionsData(permissions),
  };
};

export default init;
