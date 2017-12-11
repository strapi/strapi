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

export {
  selectApp,
  selectHasUserPlugin,
  selectPlugins,
};
