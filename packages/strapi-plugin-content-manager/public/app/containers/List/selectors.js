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

const makeSelectModelRecords = () => createSelector(
  selectListDomain(),
  (substate) => {
    return substate.get('records');
  }
);

const makeSelectLoading = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('loading')
);

const makeSelectCurrentModel = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('currentModel')
);

export {
  selectListDomain,
  makeSelectLoading,
  makeSelectModelRecords,
  makeSelectCurrentModel,
};
