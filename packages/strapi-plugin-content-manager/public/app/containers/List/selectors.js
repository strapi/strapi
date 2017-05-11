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

const makeSelectRecords = () =>
  createSelector(selectListDomain(), substate => substate.get('records'));

const makeSelectLoadingRecords = () =>
  createSelector(selectListDomain(), substate =>
    substate.get('loadingRecords')
  );

const makeSelectCount = () =>
  createSelector(selectListDomain(), substate => substate.get('count'));

const makeSelectLoadingCount = () =>
  createSelector(selectListDomain(), substate => substate.get('loadingCount'));

const makeSelectCurrentPage = () =>
  createSelector(selectListDomain(), substate => substate.get('currentPage'));

const makeSelectLimit = () =>
  createSelector(selectListDomain(), substate => substate.get('limit'));

const makeSelectSort = () =>
  createSelector(selectListDomain(), substate => substate.get('sort'));

const makeSelectCurrentModelName = () =>
  createSelector(selectListDomain(), substate =>
    substate.get('currentModelName')
  );

const makeSelectCurrentModelNamePluralized = () =>
  createSelector(selectListDomain(), substate =>
    substate.get('currentModelNamePluralized')
  );

export {
  selectListDomain,
  makeSelectRecords,
  makeSelectLoadingRecords,
  makeSelectCount,
  makeSelectLoadingCount,
  makeSelectCurrentPage,
  makeSelectLimit,
  makeSelectSort,
  makeSelectCurrentModelName,
  makeSelectCurrentModelNamePluralized,
};
