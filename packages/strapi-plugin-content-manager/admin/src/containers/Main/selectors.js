import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

/**
 * Direct selector to the main state domain
 */
const selectMainDomain = () => state =>
  state.get(`${pluginId}_main`) || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by Main
 */

const makeSelectMain = () =>
  createSelector(
    selectMainDomain(),
    substate => {
      return substate.toJS();
    }
  );

export default makeSelectMain;
export { selectMainDomain };
