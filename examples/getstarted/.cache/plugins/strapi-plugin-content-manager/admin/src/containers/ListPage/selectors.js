/**
 *
 * ListPage selectors
 *
 */

import { createSelector } from 'reselect';
import pluginId from '../../pluginId';

/**
* Direct selector to the listPage state domain
*/
const selectListPageDomain = () => state => state.get(`${pluginId}_listPage`);


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

const makeSelectFilters = () => createSelector(
  selectListPageDomain(),
  (substate) => substate.get('filters').toJS(),
);

export default makeSelectListPage;
export {
  makeSelectParams,
  makeSelectFilters,
  selectListPageDomain,
};
