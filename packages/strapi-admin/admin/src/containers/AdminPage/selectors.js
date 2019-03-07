/**
 *
 *  AdminPage selectors
 */

import { createSelector } from 'reselect';

/**
* Direct selector to the homePage state domain
*/
const selectAdminPageDomain = () => state => state.get('adminPage');

/**
* Default selector used by HomePage
*/

const makeSelectUuid = () => createSelector(
  selectAdminPageDomain(),
  substate => substate.get('uuid'),
);

const selectAdminPage = () => createSelector(
  selectAdminPageDomain(),
  (substate) => substate.toJS(),
);

export default selectAdminPage;
export { makeSelectUuid };
