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

const makeSelectPluginToDelete = () => createSelector(
  selectListPluginsPageDomain(),
  (substate) => substate.get('pluginToDelete'),
);

const makeSelectPluginDeleteAction = () => createSelector(
  selectListPluginsPageDomain(),
  (substate) => substate.get('deleteActionSucceeded'),
);

const makeSelectPlugins = () => createSelector(
  selectListPluginsPageDomain(),
  (substate) => substate.get('plugins').toJS(),
);

export default makeSelectListPluginsPage;
export {
  selectListPluginsPageDomain,
  makeSelectPluginToDelete,
  makeSelectPluginDeleteAction,
  makeSelectPlugins,
};
