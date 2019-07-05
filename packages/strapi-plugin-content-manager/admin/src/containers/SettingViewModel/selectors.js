import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

/**
 * Direct selector to the settingViewModel state domain
 */
const settingViewModelDomain = () => state =>
  state.get(`${pluginId}_settingViewModel`) || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by SettingViewModel
 */

const makeSelectSettingViewModel = () =>
  createSelector(
    settingViewModelDomain(),
    substate => {
      return substate.toJS();
    }
  );

export default makeSelectSettingViewModel;
export { settingViewModelDomain };
