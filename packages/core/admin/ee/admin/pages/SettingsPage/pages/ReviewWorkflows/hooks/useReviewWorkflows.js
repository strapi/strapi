import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const QUERY_BASE_KEY = 'review-workflows';
const API_BASE_URL = '/admin/review-workflows';

export function useReviewWorkflows(workflowId) {
  const { get, put } = useFetchClient();
  const toggleNotification = useNotification();
  const client = useQueryClient();
  const workflowQueryKey = [QUERY_BASE_KEY, workflowId ?? 'default'];

  async function fetchWorkflows({ params = { populate: 'stages' } }) {
    const {
      data: { data },
    } = await get(`${API_BASE_URL}/workflows/${workflowId ?? ''}`, { params });

    return data;
  }

  async function updateRemoteWorkflowStages({ workflowId, stages }) {
    const {
      data: { data },
    } = await put(`${API_BASE_URL}/workflows/${workflowId}/stages`, {
      data: stages,
    });

    return data;
  }

  function updateWorkflowStages(workflowId, stages) {
    return workflowUpdateMutation.mutateAsync({ workflowId, stages });
  }

  function refetchWorkflow() {
    client.refetchQueries(workflowQueryKey);
  }

  const workflows = useQuery(workflowQueryKey, fetchWorkflows);

  const workflowUpdateMutation = useMutation(updateRemoteWorkflowStages, {
    async onError() {
      // TODO: this should return the proper error thrown by the API
      toggleNotification({
        type: 'error',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },

    async onSuccess() {
      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });
    },
  });

  return {
    workflows,
    updateWorkflowStages,
    refetchWorkflow,
  };
}
