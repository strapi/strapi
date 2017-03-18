import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */
const selectGlobalDomain = () => (state) => state.get('global');

/**
 * Other specific selectors
 */


/**
 * Default selector used by List
 */

const makeSelectModels = () => createSelector(
  selectGlobalDomain(),
  (globalState) => globalState.get('models'),
);

const makeSelectLoading = () => createSelector(
  selectGlobalDomain(),
  (substate) => substate.get('loading')
);

export {
  selectGlobalDomain,
  makeSelectLoading,
  makeSelectModels,
};
