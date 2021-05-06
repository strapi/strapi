import { createSelector } from 'reselect';

/**
 * Direct selector to the languageToggle state domain
 */
const selectApp = () => state => state.app;

/**
 * Select the language locale
 */

const makeSelectApp = () => createSelector(selectApp(), appState => appState.toJS());

export default makeSelectApp;
export { selectApp };
