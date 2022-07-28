import { transformPermissionsData } from './utils';

const init = (state, permissions) => {
  return {
    ...state,
    initialData: transformPermissionsData(permissions),
    modifiedData: transformPermissionsData(permissions),
  };
};

export default init;
