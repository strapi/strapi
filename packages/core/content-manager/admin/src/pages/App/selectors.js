import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

const selectAppDomain = () => state => {
  return state[`${pluginId}_app`] || initialState;
};

const makeSelectApp = () =>
  createSelector(selectAppDomain(), substate => {
    return substate;
  });

const makeSelectModelAndComponentSchemas = () =>
  createSelector(selectAppDomain(), ({ components, models }) => ({
    schemas: [...components, ...models],
  }));

export default makeSelectApp;
export { makeSelectModelAndComponentSchemas, selectAppDomain };
