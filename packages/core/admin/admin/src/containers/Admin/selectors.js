import { createSelector } from 'reselect';
import { initialState } from './reducer';

/**
 * Direct selector to the admin state domain
 */
const selectAdminDomain = () => state => {
  return state.get('admin') || initialState;
};

/**
 * Other specific selectors
 */

/**
 * Default selector used by Admin
 */

const makeSelectAdmin = () => createSelector(selectAdminDomain(), substate => substate);

export default makeSelectAdmin;
export { selectAdminDomain };
