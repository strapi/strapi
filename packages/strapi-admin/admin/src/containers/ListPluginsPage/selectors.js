import { createSelector } from 'reselect';

/**
 * Direct selector to the listPluginsPage state domain
 */
const selectListPluginsPageDomain = () => (state) => state.get('listPluginsPage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by ListPluginsPage
 */

const makeSelectListPluginsPage = () => createSelector(
  selectListPluginsPageDomain(),
  (substate) => substate.toJS()
);

export default makeSelectListPluginsPage;
export {
  selectListPluginsPageDomain,
};
