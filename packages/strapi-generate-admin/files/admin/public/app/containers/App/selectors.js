// selectLocationState expects a plain JS object for the routing state
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

import { createSelector } from 'reselect';

/**
 * Direct selector to the languageToggle state domain
 */
const selectApp = () => state => state.get('app');

/**
 * Select the language locale
 */

const selectPlugins = () => createSelector(
  selectApp(),
  (languageState) => languageState.get('plugins')
);

export {
  selectApp,
  selectPlugins,
  selectLocationState,
};

