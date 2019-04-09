import { createSelector } from 'reselect';
import pluginId from '../../pluginId';

/**
 * Direct selector to the app state domain
 */
const selectAppDomain = () => (state) => state.get(`${pluginId}_app`);

/**
 * Other specific selectors
 */


/**
 * Default selector used by App
 */

const makeSelectApp = () => createSelector(
  selectAppDomain(),
  (substate) => substate.toJS()
);

const makeSelectConnections = () => createSelector(
  selectAppDomain(),
  substate => substate.get('connections').toJS(),
);

export default makeSelectApp;
export {
  selectAppDomain,
  makeSelectConnections,
};
