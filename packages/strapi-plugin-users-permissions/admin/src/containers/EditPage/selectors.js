import { createSelector } from 'reselect';

/**
 * Direct selector to the editPage state domain
 */
const selectEditPageDomain = () => (state) => state.get('editPage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by EditPage
 */

const makeSelectEditPage = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.toJS()
);

export default makeSelectEditPage;
export {
  selectEditPageDomain,
};
