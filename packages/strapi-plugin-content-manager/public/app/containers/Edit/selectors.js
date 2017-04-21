import { createSelector } from 'reselect';

/**
 * Direct selector to the edit state domain
 */
const selectEditDomain = () => state => state.get('edit');

/**
 * Other specific selectors
 */


/**
 * Default selector used by Edit
 */

const makeSelectRecord = () => createSelector(
  selectEditDomain(),
  (substate) => {
    return substate.get('record');
  }
);

const makeSelectLoading = () => createSelector(
  selectEditDomain(),
  (substate) => substate.get('loading')
);

const makeSelectCurrentModelName = () => createSelector(
  selectEditDomain(),
  (substate) => substate.get('currentModelName')
);

const makeSelectEditing = () => createSelector(
  selectEditDomain(),
  (substate) => substate.get('editing')
);

export default selectEditDomain;
export {
  makeSelectRecord,
  makeSelectLoading,
  makeSelectCurrentModelName,
  makeSelectEditing,
};
