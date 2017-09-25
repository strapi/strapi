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

const makeSelectRecord = () =>
  createSelector(selectEditDomain(), substate => substate.get('record'));

const makeSelectLoading = () =>
  createSelector(selectEditDomain(), substate => substate.get('loading'));

const makeSelectCurrentModelName = () =>
  createSelector(selectEditDomain(), substate =>
    substate.get('currentModelName')
  );

const makeSelectEditing = () =>
  createSelector(selectEditDomain(), substate => substate.get('editing'));

const makeSelectDeleting = () =>
  createSelector(selectEditDomain(), substate => substate.get('deleting'));

const makeSelectIsCreating = () =>
  createSelector(selectEditDomain(), substate => substate.get('isCreating'));

const makeSelectIsRelationComponentNull = () =>
  createSelector(selectEditDomain(), substate => substate.get('isRelationComponentNull'));

const makeSelectForm = () =>
  createSelector(selectEditDomain(), substate => substate.get('form'));

const makeSelectFormValidations = () =>
  createSelector(selectEditDomain(), substate => substate.get('formValidations'));

const makeSelectFormErrors = () =>
  createSelector(selectEditDomain(), substate => substate.get('formErrors'));

const makeSelectDidCheckErrors = () =>
  createSelector(selectEditDomain(), substate => substate.get('didCheckErrors'));

const makeSelectEditSuccess = () =>
  createSelector(selectEditDomain(), substate => substate.get('editSuccess'));

export default selectEditDomain;
export {
  makeSelectRecord,
  makeSelectLoading,
  makeSelectCurrentModelName,
  makeSelectEditing,
  makeSelectDeleting,
  makeSelectIsCreating,
  makeSelectIsRelationComponentNull,
  makeSelectForm,
  makeSelectFormValidations,
  makeSelectFormErrors,
  makeSelectDidCheckErrors,
  makeSelectEditSuccess,
};
