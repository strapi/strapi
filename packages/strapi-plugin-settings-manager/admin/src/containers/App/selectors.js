import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
 * Direct selector to the list state domain
 */

const selectGlobalDomain = () => state => state.get(`${pluginId}_global`);

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

const makeSelectSections = () => createSelector(
  selectGlobalDomain(),
  (globalSate) => globalSate.get('sections').toJS(),
);

const makeSelectEnvironments = () => createSelector(
  selectGlobalDomain(),
  (globalSate) => globalSate.get('environments').toJS(),
);

const makeSelectLoading = () => createSelector(
  selectGlobalDomain(),
  (globalSate) => globalSate.get('loading'),
);

export {
  makeSelectEnvironments,
  makeSelectLoading,
  makeSelectSections,
  selectLocationState,
};
export default selectGlobalDomain;
