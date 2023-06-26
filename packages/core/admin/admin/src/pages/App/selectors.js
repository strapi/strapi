import { createSelector } from 'reselect';

import { initialState } from './reducer';

const selectAppDomain = () => (state) => {
  return state.admin_app || initialState;
};

export const selectAdminPermissions = createSelector(
  selectAppDomain(),
  (state) => state.permissions
);
