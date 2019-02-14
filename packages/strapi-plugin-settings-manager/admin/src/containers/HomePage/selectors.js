import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
 * Direct selector to the home state domain
 */
const selectHomePageDomain = () => state => state.get(`${pluginId}_homePage`);

/**
 * Other specific selectors
 */


/**
 * Default selector used by Home
 */

const selectHomePage = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.toJS()
);

const makeSelectModifiedData = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('modifiedData').toJS(),
);

export default selectHomePage;
export {
  selectHomePageDomain,
  makeSelectModifiedData,
};
