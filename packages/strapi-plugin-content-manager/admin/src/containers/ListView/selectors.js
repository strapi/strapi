import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

/**
 * Direct selector to the listView state domain
 */
const listViewDomain = () => state =>
  state.get(`${pluginId}_listView`) || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by listView
 */

const makeSelectListView = () =>
  createSelector(
    listViewDomain(),
    substate => {
      return substate.toJS();
    }
  );

export default makeSelectListView;
export { listViewDomain };
