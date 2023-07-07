import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export function useReviewWorkflows(params = {}) {
  const { id = '', ...queryParams } = params;
  const defaultQueryParams = {
    populate: 'stages',
  };

  const { get } = useFetchClient();

  const { data, isLoading, status, refetch } = useQuery(
    ['review-workflows', 'workflows', id],
    async () => {
      try {
        const {
          data: { data },
        } = await get(`/admin/review-workflows/workflows/${id}`, {
          params: { ...defaultQueryParams, ...queryParams },
        });

        return data;
      } catch (err) {
        // silence
        return null;
      }
    }
  );

  let workflows = [];

  if (id && data) {
    workflows = [data];
  } else if (Array.isArray(data)) {
    workflows = data;
  }

  return {
    workflows,
    isLoading,
    status,
    refetch,
  };
}
