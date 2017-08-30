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

const makeSelectModel = () => createSelector(
  selectModelPageDomain(),
  (substate) => substate.get('model').toJS(),
);

export default selectModelPage;
export {
  selectModelPageDomain,
  makeSelectModel,
};
