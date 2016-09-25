/**
 * The global state selectors
 */

import { createSelector } from 'reselect';

const selectHome = () => (state) => state.get('home');

const selectLoading = () => createSelector(
  selectHome(),
  (homeState) => homeState.get('loading')
);

const selectError = () => createSelector(
  selectHome(),
  (homeState) => homeState.get('error')
);

const selectGeneralSettings = () => createSelector(
  selectHome(),
  (homeState) => homeState.get('generalSettings')
);

const selectLocationState = () => {
  let prevRoutingState;
  let prevRoutingStateJS;

  return (state) => {
    const routingState = state.get('route'); // or state.route

    if (!routingState.equals(prevRoutingState)) {
      prevRoutingState = routingState;
      prevRoutingStateJS = routingState.toJS();
    }

    return prevRoutingStateJS;
  };
};

export {
  selectHome,
  selectLoading,
  selectError,
  selectGeneralSettings,
  selectLocationState,
};
