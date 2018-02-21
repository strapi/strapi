/**
 *
 * EditPage selectors
 *
 */

import { createSelector } from 'reselect';

/**
* Direct selector to the listPage state domain
*/
const selectEditPageDomain = () => state => state.get('editPage');


/**
 * Default selector used by EditPage
 */

const makeSelectEditPage = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.toJS()
);

/**
 *
 * Other specific selectors
 */

export default makeSelectEditPage;
export {
  selectEditPageDomain,
};
