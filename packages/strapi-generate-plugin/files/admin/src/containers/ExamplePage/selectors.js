import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
 * Direct selector to the examplePage state domain
 */
const selectExamplePageDomain = () => state => state.get(`${pluginId}_examplePage`);

/**
 * Default selector used by HomePage
 */

const makeSelectLoading = () =>
  createSelector(
    selectExamplePageDomain(),
    substate => substate.get('loading'),
  );

const makeSelectData = () =>
  createSelector(
    selectExamplePageDomain(),
    substate => substate.get('data'),
  );

export { makeSelectLoading, makeSelectData };
