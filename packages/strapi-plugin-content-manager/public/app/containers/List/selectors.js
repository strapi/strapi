import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */
const selectListDomain = () => state => state.get('list');

/**
 * Other specific selectors
 */


/**
 * Default selector used by List
 */

const selectList = () => createSelector(
  selectListDomain(),
  (substate) => substate.toJS()
);

export default selectList;
export {
  selectListDomain,
};
