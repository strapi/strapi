import { ACTION_SET_WORKFLOW } from '../constants';

export function setWorkflow(reactQueryWorkflowResponse) {
  return {
    type: ACTION_SET_WORKFLOW,
    payload: {
      status: reactQueryWorkflowResponse.status,
      stages: reactQueryWorkflowResponse.data,
    },
  };
}
