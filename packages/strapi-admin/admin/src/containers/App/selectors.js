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

const selectHasUserPlugin = () => createSelector(
  selectApp(),
  (appState) => appState.get('hasUserPlugin'),
);

const makeSelectShowGlobalAppBlocker = () => createSelector(
  selectApp(),
  (appState) => appState.get('showGlobalAppBlocker'),
);

export {
  selectApp,
  selectHasUserPlugin,
  selectPlugins,
  makeSelectShowGlobalAppBlocker,
};
