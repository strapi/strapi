import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

/**
 * Direct selector to the settingView state domain
 */
const settingsViewDomain = () => state =>
  state.get(`${pluginId}_settingsView`) || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by SettingsView
 */

const makeSelectSettingsView = () =>
  createSelector(
    settingsViewDomain(),
    substate => {
      return substate.toJS();
    }
  );

const makeSelectModifiedData = () =>
  createSelector(
    settingsViewDomain(),
    substate => {
      return substate.get('modifiedData').toJS();
    }
  );
export default makeSelectSettingsView;
export { settingsViewDomain, makeSelectModifiedData };
