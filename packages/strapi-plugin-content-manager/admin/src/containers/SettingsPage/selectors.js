/**
 * 
 * SettingsPage selectors
 */

import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
* Direct selector to the settingsPage state domain
*/
const selectSettingsPageDomain = () => state => state.get(`${pluginId}_settingsPage`);


/**
 * Default selector used by EditPage
 */

const makeSelectSettingsPage = () => createSelector(
  selectSettingsPageDomain(),
  (substate) => substate.toJS()
);


export default makeSelectSettingsPage;
