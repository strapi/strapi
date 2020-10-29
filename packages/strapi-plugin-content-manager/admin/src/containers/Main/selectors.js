import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

/**
 * Direct selector to the main state domain
 */
const selectMainDomain = () => state => state.get(`${pluginId}_main`) || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by Main
 */

const makeSelectMain = () =>
  createSelector(selectMainDomain(), substate => {
    return substate.toJS();
  });

const makeSelectModels = () =>
  createSelector(selectMainDomain(), substate => {
    const allModels = substate.get('models').toJS();

    return allModels.filter(model => model.isDisplayed === true).map(({ uid }) => uid);
  });

export default makeSelectMain;
export { makeSelectModels, selectMainDomain };
