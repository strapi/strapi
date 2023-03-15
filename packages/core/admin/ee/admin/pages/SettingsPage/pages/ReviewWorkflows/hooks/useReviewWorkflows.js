import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useFetchClient, useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';

const QUERY_BASE_KEY = 'review-workflows';
const API_BASE_URL = '/admin/review-workflows';
const API_CM_BASE_URL = '/admin/content-manager';

export function useReviewWorkflows(workflowId) {
  const { get, put } = useFetchClient();
  const toggleNotification = useNotification();
  const client = useQueryClient();
  const { formatAPIError } = useAPIErrorHandler();
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

  async function updateEntityStage({ entityId, stageId, uid }) {
    const {
      data: { data },
      // TODO: endpoint differs for collection-types and single-types
    } = await put(`${API_CM_BASE_URL}/collection-types/${uid}/${entityId}/stage`, {
      data: { id: stageId },
    });

    return data;
  }

  function updateWorkflowStages(workflowId, stages) {
    return workflowUpdateMutation.mutateAsync({ workflowId, stages });
  }

  function setStageForEntity(...args) {
    return entityStageMutation.mutateAsync(...args);
  }

  function refetchWorkflow() {
    client.refetchQueries(workflowQueryKey);
  }

  const workflows = useQuery(workflowQueryKey, fetchWorkflows);

  const workflowUpdateMutation = useMutation(updateRemoteWorkflowStages, {
    async onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    },

    async onSuccess() {
      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });
    },
  });

  const entityStageMutation = useMutation(updateEntityStage);

  return {
    workflows,
    entityStageMutation,
    updateWorkflowStages,
    refetchWorkflow,
    setStageForEntity,
  };
}
