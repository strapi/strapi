import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */
const selectListDomain = () => state => state.get('list');

/**
 * Other specific selectors
 */


/**
 * Default selector used by List
 */

const makeSelectRecords = () => createSelector(
  selectListDomain(),
  (substate) => {
    return substate.get('records');
  }
);

const makeSelectLoadingRecords = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('loadingRecords')
);

const makeSelectCount = () => createSelector(
  selectListDomain(),
  (substate) => {
    return substate.get('count');
  }
);

const makeSelectLoadingCount = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('loadingCount')
);

const makeSelectCurrentPage = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('currentPage')
);

const makeSelectLimitPerPage = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('limitPerPage')
);

const makeSelectSort = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('sort')
);

const makeSelectCurrentModelName = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('currentModelName')
);

export {
  selectListDomain,
  makeSelectRecords,
  makeSelectLoadingRecords,
  makeSelectCount,
  makeSelectLoadingCount,
  makeSelectCurrentPage,
  makeSelectLimitPerPage,
  makeSelectSort,
  makeSelectCurrentModelName,
};
