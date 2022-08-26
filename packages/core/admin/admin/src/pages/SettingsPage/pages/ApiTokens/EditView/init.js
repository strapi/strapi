import { transformPermissionsData } from './utils';

const init = (state, permissions) => {
  return {
    ...state,
    selectedActions: [],
    data: transformPermissionsData(permissions),
  };
};

export default init;
