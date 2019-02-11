/**
 * 
 * SettingPage selectors
 */

import { createSelector } from 'reselect';

/**
* Direct selector to the settingPage state domain
*/
const selectSettingPageDomain = () => state => state.get('content-manager-settingPage');


/**
 * Default selector used by EditPage
 */

const makeSelectSettingPage = () => createSelector(
  selectSettingPageDomain(),
  (substate) => substate.toJS()
);


export default makeSelectSettingPage;
