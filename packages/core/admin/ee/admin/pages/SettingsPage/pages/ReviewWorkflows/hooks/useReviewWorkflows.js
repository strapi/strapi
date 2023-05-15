import { useQuery, useQueryClient } from 'react-query';
import { useFetchClient } from '@strapi/helper-plugin';

const QUERY_BASE_KEY = 'review-workflows';
const API_BASE_URL = '/admin/review-workflows';

export function useReviewWorkflows(workflowId) {
  const { get } = useFetchClient();
  const client = useQueryClient();
  const workflowQueryKey = [QUERY_BASE_KEY, workflowId ?? 'default'];

  async function fetchWorkflows({ params = { populate: 'stages' } }) {
    try {
      const {
        data: { data },
      } = await get(`${API_BASE_URL}/workflows/${workflowId ?? ''}`, { params });

      return data;
    } catch (err) {
      // silence
      return null;
    }
  }

  async function refetchWorkflow() {
    await client.refetchQueries(workflowQueryKey);
  }

  const workflows = useQuery(workflowQueryKey, fetchWorkflows);

  return {
    workflows,
    refetchWorkflow,
  };
}
