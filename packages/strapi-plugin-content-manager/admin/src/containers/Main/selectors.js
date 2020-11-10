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

const makeSelectModelAndComponentSchemas = () =>
  createSelector(selectMainDomain(), ({ components, models }) => ({
    schemas: [...components, ...models],
  }));

export default makeSelectMain;
export { makeSelectModelAndComponentSchemas, selectMainDomain };
