import { createSelector } from 'reselect';

/**
 * Direct selector to the home state domain
 */
const selectHomeDomain = () => state => state.get('home');

/**
 * Other specific selectors
 */


/**
 * Default selector used by Home
 */

const selectHome = () => createSelector(
  selectHomeDomain(),
  (substate) => substate.toJS()
);

const makeSelectModifiedData = () => createSelector(
  selectHomeDomain(),
  (substate) => substate.get('modifiedData').toJS(),
);

export default selectHome;
export {
  selectHomeDomain,
  makeSelectModifiedData,
};
