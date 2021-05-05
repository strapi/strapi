import { createSelector } from 'reselect';

/**
 * Direct selector to the languageToggle state domain
 */
const selectApp = () => state => state.app;

/**
 * Select the language locale
 */

const makeSelectApp = () => createSelector(selectApp(), appState => appState.toJS());

const makeSelectShowGlobalAppBlocker = () =>
  createSelector(selectApp(), appState => appState.get('showGlobalAppBlocker'));

const makeSelectBlockApp = () => createSelector(selectApp(), appState => appState.get('blockApp'));

const makeSelectOverlayBlockerProps = () =>
  createSelector(selectApp(), appState => appState.get('overlayBlockerData'));

export default makeSelectApp;
export {
  selectApp,
  makeSelectBlockApp,
  makeSelectOverlayBlockerProps,
  makeSelectShowGlobalAppBlocker,
};
