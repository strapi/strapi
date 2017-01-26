import { createSelector } from 'reselect';

/**
 * Direct selector to the single state domain
 */
const selectSingleDomain = () => state => state.get('single');

/**
 * Other specific selectors
 */


/**
 * Default selector used by Single
 */

const selectSingle = () => createSelector(
  selectSingleDomain(),
  (substate) => substate.get('record')
);

export default selectSingle;
export {
  selectSingleDomain,
  selectSingle
};
