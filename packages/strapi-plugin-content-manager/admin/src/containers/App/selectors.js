import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */
const selectGlobalDomain = () => state => state.get('global');

/**
 * Other specific selectors
 */

const selectLocationState = () => {
  let prevRoutingState;
  let prevRoutingStateJS;

  return state => {
    const routingState = state.get('route'); // or state.route

    if (!routingState.equals(prevRoutingState)) {
      prevRoutingState = routingState;
      prevRoutingStateJS = routingState.toJS();
    }

    return prevRoutingStateJS;
  };
};

const makeSelectHoverIndex = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('hoverIndex')
  );
const makeSelectModelEntries = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('modelEntries')
  );
const makeSelectLoading = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('loading'));
const makeSelectSchema = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('schema').toJS());
const makeSelectModifiedSchema = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('modifiedSchema').toJS());
const makeSelectSubmitSuccess = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('submitSuccess'));

export {
  selectGlobalDomain,
  selectLocationState,
  makeSelectHoverIndex,
  makeSelectLoading,
  makeSelectModelEntries,
  makeSelectModifiedSchema,
  makeSelectSchema,
  makeSelectSubmitSuccess,
};
