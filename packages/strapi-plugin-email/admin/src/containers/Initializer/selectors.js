import { createSelector } from 'reselect';

/**
 * Direct selector to the initializer state domain
 */
const selectInitializerDomain = () => (state) => state.get(`email-initializer`);

/**
 * Other specific selectors
 */


/**
 * Default selector used by Initializer
 */

const makeSelectInitializer = () => createSelector(
  selectInitializerDomain(),
  (substate) => substate.toJS()
);

export default makeSelectInitializer;
export {
  selectInitializerDomain,
};
