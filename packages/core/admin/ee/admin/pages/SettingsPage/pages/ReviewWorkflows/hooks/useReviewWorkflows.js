import { useQuery } from 'react-query';

import { useFetchClient } from '@strapi/helper-plugin';

export function useReviewWorkflows(workflowId) {
  const { get } = useFetchClient();

  async function fetchWorkflows() {
    /* TODO: mocked for now until the API is ready */
    return [
      {
        id: 1,
        stages: [
          {
            id: 'id-1',
            name: 'To do',
          },

          {
            id: 'id-2',
            name: 'Ready to review',
          },

          {
            id: 'id-3',
            name: 'In progress',
          },

          {
            id: 'id-4',
            name: 'Reviewed',
          },
        ],
      },
    ];

    // eslint-disable-next-line no-unreachable
    try {
      const { data } = await get(
        `/admin/review-workflows/workflows/${workflowId ?? ''}?populate=stages`
      );

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
