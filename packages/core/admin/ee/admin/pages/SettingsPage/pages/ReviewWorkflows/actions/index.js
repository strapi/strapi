import { ACTION_SET_LOADING_STATE, ACTION_SET_STAGES } from '../constants';

export function setWorkflowLoadingState(state) {
  return {
    type: ACTION_SET_LOADING_STATE,
    payload: {
      state,
    },
  };
}

export function setWorkflowStages(stages) {
  return {
    type: ACTION_SET_STAGES,
    payload: {
      stages,
    },
  };
}
