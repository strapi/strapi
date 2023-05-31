import { createSelector } from 'reselect';
import { initialState } from './reducer';

const selectAppDomain = () => (state) => {
  return state['content-manager_app'] || initialState;
};

const makeSelectApp = () =>
  createSelector(selectAppDomain(), (substate) => {
    return substate;
  });

const makeSelectModels = () => createSelector(selectAppDomain(), (state) => state.models);

const makeSelectModelLinks = () =>
  createSelector(selectAppDomain(), (state) => ({
    collectionTypeLinks: state.collectionTypeLinks,
    singleTypeLinks: state.singleTypeLinks,
  }));

const makeSelectModelAndComponentSchemas = () =>
  createSelector(selectAppDomain(), ({ components, models }) => ({
    schemas: [...components, ...models],
  }));

const selectFieldSizes = createSelector(selectAppDomain(), (state) => state.fieldSizes);

export default makeSelectApp;
export {
  makeSelectModelAndComponentSchemas,
  makeSelectModelLinks,
  makeSelectModels,
  selectFieldSizes,
  selectAppDomain,
};
