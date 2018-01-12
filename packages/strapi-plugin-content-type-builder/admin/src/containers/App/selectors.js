import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */

const selectGlobalDomain = () => state => state.get('global');

const makeSelectBlockApp = () => createSelector(
  selectGlobalDomain(),
  (globalSate) => globalSate.get('blockApp'),
);

const makeSelectLoading = () => createSelector(
  selectGlobalDomain(),
  (globalSate) => globalSate.get('loading'),
);

const makeSelectModels = () => createSelector(
  selectGlobalDomain(),
  (globalSate) => globalSate.get('models').toJS(),
);

const makeSelectMenu = () => createSelector(
  selectGlobalDomain(),
  (globalSate) => globalSate.get('menu').toJS(),
);

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


export {
  selectLocationState,
  makeSelectBlockApp,
  makeSelectLoading,
  makeSelectMenu,
  makeSelectModels,
};
