import { createSelector } from 'reselect';
import { initialState } from './reducer';

const selectPermissionsManagerDomain = () => state => {
  return state.get('permissionsManager') || initialState;
};

const makeSelectPermissionsManager = () =>
  createSelector(selectPermissionsManagerDomain(), substate => substate);

export default makeSelectPermissionsManager;
export { selectPermissionsManagerDomain };
