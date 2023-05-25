import { useQuery } from 'react-query';
import { useFetchClient } from '@strapi/helper-plugin';
import { stringify } from 'qs';

export function useReviewWorkflows(params = {}) {
  const { id = '', ...queryParams } = params;
  const defaultQueryParams = {
    populate: 'stages',
  };

  const { get } = useFetchClient();
  const queryString = stringify({ ...defaultQueryParams, ...queryParams }, { encode: false });

  const { data, isLoading, status, refetch } = useQuery(
    ['review-workflows', 'workflows', id],
    async () => {
      try {
        const {
          data: { data },
        } = await get(
          `/admin/review-workflows/workflows/${id}${queryString ? `?${queryString}` : ''}`
        );

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
