/**
 * 
 * SettingsPage selectors
 */

import { createSelector } from 'reselect';

/**
* Direct selector to the settingsPage state domain
*/
const selectSettingsPageDomain = () => state => state.get('settingsPage');


/**
 * Default selector used by EditPage
 */

const makeSelectSettingsPage = () => createSelector(
  selectSettingsPageDomain(),
  (substate) => substate.toJS()
);


export default makeSelectSettingsPage;