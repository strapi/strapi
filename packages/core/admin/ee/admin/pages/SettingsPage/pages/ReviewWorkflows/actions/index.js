import { ACTION_SET_WORKFLOWS } from '../constants';

export function setWorkflows(reactQueryWorkflowResponse) {
  const payload = {
    status: reactQueryWorkflowResponse.status,
    workflows: reactQueryWorkflowResponse.data,
  };

  return {
    type: ACTION_SET_WORKFLOWS,
    payload,
  };
}
