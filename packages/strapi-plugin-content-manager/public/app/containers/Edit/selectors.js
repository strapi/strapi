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

const makeSelectCurrentModel = () => createSelector(
  selectEditDomain(),
  (substate) => substate.get('currentModel')
);

export default selectEditDomain;
export {
  makeSelectRecord,
  makeSelectLoading,
  makeSelectCurrentModel,
};
