import { createSelector } from 'reselect';

/**
 * Direct selector to the authPage state domain
 */
const selectAuthPageDomain = () => (state) => state.get('authPage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by AuthPage
 */

const makeSelectAuthPage = () => createSelector(
  selectAuthPageDomain(),
  (substate) => substate.toJS()
);

export default makeSelectAuthPage;
export {
  selectAuthPageDomain,
};
