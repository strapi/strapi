import { createSelector } from 'reselect';

/**
 * Direct selector to the homePage state domain
 */
const selectHomePageDomain = () => state => state.get('homePage');

/**
 * Default selector used by HomePage
 */

const selectHomePage = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.toJS(),
);

/**
* Other specific selectors
*/

const makeSelectAllData = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('data').toJS(),
);

const makeSelectDataToDelete = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('dataToDelete').toJS(),
);


const makeSelectDeleteEndPoint = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('deleteEndPoint'),
);

const makeSelectModifiedData = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('modifiedData').toJS(),
);

export default selectHomePage;
export {
  makeSelectAllData,
  makeSelectDataToDelete,
  makeSelectDeleteEndPoint,
  makeSelectModifiedData,
};
