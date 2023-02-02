import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const QUERY_BASE_KEY = 'review-workflows';

export function useReviewWorkflows(workflowId) {
  const { get, put } = useFetchClient();
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  async function fetchWorkflows() {
    try {
      const {
        data: { data },
      } = await get(`/admin/review-workflows/workflows/${workflowId ?? ''}?populate=stages`);

      return data;
    } catch (err) {
      return null;
    }
  }

  async function updateRemoteWorkflowStages({ workflowId, stages }) {
    try {
      const {
        data: { data },
      } = await put(`/admin/review-workflows/workflows/${workflowId}/stages`, {
        data: stages,
      });

      return data;
    } catch (err) {
      return null;
    }
  }

  function updateWorkflowStages(workflowId, stages) {
    return workflowUpdateMutation.mutateAsync({ workflowId, stages });
  }

  const workflows = useQuery([QUERY_BASE_KEY, workflowId ?? 'default'], fetchWorkflows);

  const workflowUpdateMutation = useMutation(updateRemoteWorkflowStages, {
    async onError() {
      toggleNotification({
        type: 'error',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },

    async onSuccess() {
      queryClient.refetchQueries([QUERY_BASE_KEY]);

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });
    },
  });

  return {
    workflows,
    updateWorkflowStages,
  };
}
