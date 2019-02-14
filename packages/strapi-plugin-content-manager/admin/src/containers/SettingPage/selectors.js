/**
 * 
 * SettingPage selectors
 */

import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
* Direct selector to the settingPage state domain
*/
const selectSettingPageDomain = () => state => state.get(`${pluginId}_settingPage`);


/**
 * Default selector used by EditPage
 */

const makeSelectSettingPage = () => createSelector(
  selectSettingPageDomain(),
  (substate) => substate.toJS()
);


export default makeSelectSettingPage;
