import { createSelector } from 'reselect';
import pluginId from 'pluginId';
/**
 * Direct selector to the homePage state domain
 */
const selectHomePageDomain = () => state => state.get(`${pluginId}_homePage`);

/**
 * Default selector used by HomePage
 */

const selectHomePage = () =>
  createSelector(
    selectHomePageDomain(),
    substate => substate.toJS(),
  );

export default selectHomePage;
