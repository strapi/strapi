import type { State } from './reducer';
import type { Permissions, Routes } from '../../types';

/** Initializes saved and editable permissions from the role response. */
const init = (state: State, permissions: Permissions, routes: Routes) => {
  return {
    ...state,
    initialData: permissions,
    modifiedData: permissions,
    routes,
  };
};

export { init };
