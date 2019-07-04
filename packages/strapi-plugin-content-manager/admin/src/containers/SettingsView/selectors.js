import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

/**
 * Direct selector to the settingView state domain
 */
const settingViewDomain = () => state =>
  state.get(`${pluginId}_settingsView`) || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by Main
 */

const makeSelectSettingView = () =>
  createSelector(
    settingViewDomain(),
    substate => {
      return substate.toJS();
    }
  );

const makeSelectModifiedData = () =>
  createSelector(
    settingViewDomain(),
    substate => {
      return substate.get('modifiedData').toJS();
    }
  );
export default makeSelectSettingView;
export { settingViewDomain, makeSelectModifiedData };
