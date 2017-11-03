import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */
const selectGlobalDomain = () => state => state.get('global');

/**
 * Other specific selectors
 */

const selectLocationState = () => {
  let prevRoutingState;
  let prevRoutingStateJS;

  return state => {
    const routingState = state.get('route'); // or state.route

    if (!routingState.equals(prevRoutingState)) {
      prevRoutingState = routingState;
      prevRoutingStateJS = routingState.toJS();
    }

    return prevRoutingStateJS;
  };
};

/**
 * Default selector used by List
 */

const makeSelectModels = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('models')
  );

const makeSelectModelEntries = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('modelEntries')
  );

const makeSelectLoading = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('loading'));

const makeSelectSchema = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('schema'));

export {
  selectGlobalDomain,
  selectLocationState,
  makeSelectLoading,
  makeSelectModelEntries,
  makeSelectModels,
  makeSelectSchema,
};
