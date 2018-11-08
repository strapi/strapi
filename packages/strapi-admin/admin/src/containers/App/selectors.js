import { createSelector } from 'reselect';

/**
 * Direct selector to the languageToggle state domain
 */
const selectApp = () => (state) => state.get('app');

/**
 * Select the language locale
 */

const selectPlugins = () => createSelector(
  selectApp(),
  (appState) => appState.get('plugins')
);

const makeSelectApp = () => createSelector(
  selectApp(),
  appState => appState.toJS(),
);

const selectHasUserPlugin = () => createSelector(
  selectApp(),
  (appState) => appState.get('hasUserPlugin'),
);

const makeSelectShowGlobalAppBlocker = () => createSelector(
  selectApp(),
  (appState) => appState.get('showGlobalAppBlocker'),
);

const makeSelectBlockApp = () => createSelector(
  selectApp(),
  (appState) => appState.get('blockApp'),
);

const makeSelectIsAppLoading = () => createSelector(
  selectApp(),
  appState => appState.get('isAppLoading'),
);

const makeSelectAppPlugins = () => createSelector(
  selectApp(),
  appState => appState.get('appPlugins').toJS(),
);
export default makeSelectApp;
export {
  selectApp,
  selectHasUserPlugin,
  selectPlugins,
  makeSelectAppPlugins,
  makeSelectBlockApp,
  makeSelectIsAppLoading,
  makeSelectShowGlobalAppBlocker,
};
