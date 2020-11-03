import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

const selectMainDomain = () => state => {
  return state.get(`${pluginId}_main`) || initialState;
};

const makeSelectMain = () =>
  createSelector(selectMainDomain(), substate => {
    return substate;
  });

const makeSelectModels = () =>
  createSelector(selectMainDomain(), substate => {
    const { models } = substate;

    return models.filter(model => model.isDisplayed === true).map(({ uid }) => uid);
  });

export default makeSelectMain;
export { makeSelectModels, selectMainDomain };
