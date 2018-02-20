/**
 *
 * ListPage selectors
 *
 */

import { createSelector } from 'reselect';

/**
* Direct selector to the listPage state domain
*/
const selectListPageDomain = () => state => state.get('listPage');


/**
 * Default selector used by ListPage
 */

const makeSelectListPage = () => createSelector(
  selectListPageDomain(),
  (substate) => substate.toJS()
);

/**
 *
 * Other specific selectors
 */
const makeSelectCurrentModel = () => createSelector(
  selectListPageDomain(),
  (substate) => substate.get('currentModel'),
);

const makeSelectSource = () => createSelector(
  selectListPageDomain(),
  (substate) => substate.get('source'),
);

export default makeSelectListPage;
export {
  makeSelectCurrentModel,
  makeSelectSource,
  selectListPageDomain,
};
