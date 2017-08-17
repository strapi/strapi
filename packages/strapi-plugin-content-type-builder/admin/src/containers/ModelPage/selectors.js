import { createSelector } from 'reselect';

/**
 * Direct selector to the modelPage state domain
 */
const selectModelPageDomain = () => state => state.get('modelPage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by ModelPage
 */

const selectModelPage = () => createSelector(
  selectModelPageDomain(),
  (substate) => substate.toJS()
);

export default selectModelPage;
export {
  selectModelPageDomain,
};
