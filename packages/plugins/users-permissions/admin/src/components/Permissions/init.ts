import type { State } from './reducer';
import type { Permissions } from '../../types';

/** Initializes collapsed permission groups in alphabetical order. */
const init = (initialState: State, permissions: Permissions) => {
  const collapses = Object.keys(permissions)
    .sort()
    .map((name) => ({ name, isOpen: false }));

  return { ...initialState, collapses };
};

export { init };
