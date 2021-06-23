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

const makeSelectModels = () => createSelector(selectAppDomain(), state => state.models);

const makeSelectModelLinks = () =>
  createSelector(selectAppDomain(), state => ({
    collectionTypeLinks: state.collectionTypeLinks,
    singleTypeLinks: state.singleTypeLinks,
  }));

const makeSelectModelAndComponentSchemas = () =>
  createSelector(selectAppDomain(), ({ components, models }) => ({
    schemas: [...components, ...models],
  }));

export default makeSelectApp;
export {
  makeSelectModelAndComponentSchemas,
  makeSelectModelLinks,
  makeSelectModels,
  selectAppDomain,
};
