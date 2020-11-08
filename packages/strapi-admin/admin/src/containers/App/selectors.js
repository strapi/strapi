import { createSelector } from 'reselect';

/**
 * Direct selector to the languageToggle state domain
 */
const selectApp = () => state => state.get('app');

/**
 * Select the language locale
 */

const selectPlugins = () =>
  createSelector(
    selectApp(),
    appState => appState.get('plugins')
  );

const makeSelectApp = () =>
  createSelector(
    selectApp(),
    appState => appState.toJS()
  );

const selectHasUserPlugin = () =>
  createSelector(
    selectApp(),
    appState => appState.get('hasUserPlugin')
  );

const makeSelectShowGlobalAppBlocker = () =>
  createSelector(
    selectApp(),
    appState => appState.get('showGlobalAppBlocker')
  );

const makeSelectBlockApp = () =>
  createSelector(
    selectApp(),
    appState => appState.get('blockApp')
  );

const makeSelectOverlayBlockerProps = () =>
  createSelector(
    selectApp(),
    appState => appState.get('overlayBlockerData')
  );

const makeSelectUuid = () =>
  createSelector(
    selectApp(),
    appState => appState.get('uuid')
  );

export default makeSelectApp;
export {
  selectApp,
  selectHasUserPlugin,
  selectPlugins,
  makeSelectBlockApp,
  makeSelectOverlayBlockerProps,
  makeSelectShowGlobalAppBlocker,
  makeSelectUuid,
};
