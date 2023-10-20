import { createSelector } from '@reduxjs/toolkit';
import isEqual from 'lodash/isEqual';

import { REDUX_NAMESPACE } from './constants';
import { initialState } from './reducer';

export const selectNamespace = (state) => state[REDUX_NAMESPACE] ?? initialState;

export const selectContentTypes = createSelector(
  selectNamespace,
  ({ serverState: { contentTypes } }) => contentTypes
);

export const selectRoles = createSelector(selectNamespace, ({ serverState: { roles } }) => roles);

export const selectCurrentWorkflow = createSelector(
  selectNamespace,
  ({ clientState: { currentWorkflow } }) => currentWorkflow.data
);

export const selectWorkflows = createSelector(
  selectNamespace,
  ({ serverState: { workflows } }) => workflows
);

export const selectIsWorkflowDirty = createSelector(
  selectNamespace,
  ({ serverState, clientState: { currentWorkflow } }) =>
    !isEqual(serverState.workflow, currentWorkflow.data)
);

export const selectHasDeletedServerStages = createSelector(
  selectNamespace,
  ({ serverState, clientState: { currentWorkflow } }) =>
    !(serverState.workflow?.stages ?? []).every(
      (stage) => !!currentWorkflow.data.stages.find(({ id }) => id === stage.id)
    )
);

export const selectIsLoading = createSelector(
  selectNamespace,
  ({ clientState: { isLoading } }) => isLoading
);

export const selectServerState = createSelector(selectNamespace, ({ serverState }) => serverState);
