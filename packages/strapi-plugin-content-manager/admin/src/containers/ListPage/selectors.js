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
const makeSelectParams = () => createSelector(
  selectListPageDomain(),
  (substate) => substate.get('params').toJS(),
);

export default makeSelectListPage;
export {
  makeSelectParams,
  selectListPageDomain,
};
