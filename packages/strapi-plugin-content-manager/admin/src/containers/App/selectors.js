import { createSelector } from 'reselect';
import pluginId from 'pluginId';
/**
 * Direct selector to the list state domain
 */
const selectGlobalDomain = () => state => state.get(`${pluginId}_global`);

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

const makeSelectAddedField = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('addedField')
  );
const makeSelectDraggedItemName = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('draggedItemName')
  );
const makeSelectHoverIndex = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('hoverIndex')
  );
const makeSelectModelEntries = () =>
  createSelector(selectGlobalDomain(), globalState =>
    globalState.get('modelEntries')
  );
const makeSelectGrid = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('grid').toJS());
const makeSelectInitDragLine = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('initDragLine'));
const makeSelectLoading = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('loading'));
const makeSelectSchema = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('schema').toJS());
const makeSelectModifiedSchema = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('modifiedSchema').toJS());
const makeSelectShouldResetGrid = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('shouldResetGrid'));
const makeSelectSubmitSuccess = () =>
  createSelector(selectGlobalDomain(), substate => substate.get('submitSuccess'));

export {
  selectGlobalDomain,
  selectLocationState,
  makeSelectAddedField,
  makeSelectDraggedItemName,
  makeSelectHoverIndex,
  makeSelectGrid,
  makeSelectInitDragLine,
  makeSelectLoading,
  makeSelectModelEntries,
  makeSelectModifiedSchema,
  makeSelectSchema,
  makeSelectShouldResetGrid,
  makeSelectSubmitSuccess,
};
