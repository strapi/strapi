import { createSelector } from 'reselect';

import { initialState } from './reducer';

/**
 * Direct selector to the listView state domain
 */
const listViewDomain = () => (state) => state['content-manager_listView'] || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by listView
 */

const makeSelectListView = () =>
  createSelector(listViewDomain(), (substate) => {
    return substate;
  });

const selectDisplayedHeaders = (state) => {
  const { displayedHeaders } = state['content-manager_listView'];

  return displayedHeaders;
};

export default makeSelectListView;
export { listViewDomain, selectDisplayedHeaders };
