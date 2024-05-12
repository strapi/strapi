import { createSelector } from '@reduxjs/toolkit';
import isEqual from 'lodash/isEqual';

import { RootState } from '../../../../../../../admin/src/core/store/configure';
import { Stage } from '../../../../../../../shared/contracts/review-workflows';

import { REDUX_NAMESPACE } from './constants';
import { State, initialState } from './reducer';

interface Store extends RootState {
  [REDUX_NAMESPACE]: State;
}

export const selectNamespace = (state: Store) => state[REDUX_NAMESPACE] ?? initialState;

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
      (stage: Partial<Stage>) => !!currentWorkflow.data.stages?.find(({ id }) => id === stage.id)
    )
);

export const selectIsLoading = createSelector(
  selectNamespace,
  ({ clientState: { isLoading } }) => isLoading
);

export const selectServerState = createSelector(selectNamespace, ({ serverState }) => serverState);
