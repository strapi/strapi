import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */

const selectGlobalDomain = () => state => state.get('global');

const makeSelectBlockApp = () => createSelector(
  selectGlobalDomain(),
  (globalState) => globalState.get('blockApp'),
);

export {
  makeSelectBlockApp,
};
