/**
 * The home state selectors
 */

import { createSelector } from 'reselect';

/*
 * Select home state
 */
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

const selectName = () => createSelector(
  selectHome(),
  (homeState) => homeState.get('name')
);

const selectDescription = () => createSelector(
  selectHome(),
  (homeState) => homeState.get('description')
);

const selectVersion = () => createSelector(
  selectHome(),
  (homeState) => homeState.get('version')
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
  selectName,
  selectDescription,
  selectVersion,
  selectLocationState,
};
