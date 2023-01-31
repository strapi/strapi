import { useQuery } from 'react-query';

import { useFetchClient } from '@strapi/helper-plugin';

export function useReviewWorkflows(workflowId) {
  const { get } = useFetchClient();

  async function fetchWorkflows() {
    // eslint-disable-next-line no-unreachable
    try {
      const {
        data: { data },
      } = await get(`/admin/review-workflows/workflows/${workflowId ?? ''}?populate=stages`);

      return data;
    } catch (err) {
      return null;
    }
  }

  const workflows = useQuery(['review-workflows', workflowId ?? 'default'], fetchWorkflows);

  return {
    workflows,
  };
}
