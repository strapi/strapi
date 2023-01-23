import { useQuery } from 'react-query';

import { useFetchClient } from '@strapi/helper-plugin';

export function useReviewWorkflows(workflowUid) {
  const { get } = useFetchClient();

  async function fetchWorkflows() {
    try {
      const { data } = await get(`/admin/review-workflows/workflows/${workflowUid ?? ''}`);

      return data;
    } catch (err) {
      return null;
    }
  }

  const workflows = useQuery(['review-workflows', workflowUid ?? 'default'], fetchWorkflows);

  return {
    workflows,
  };
}
