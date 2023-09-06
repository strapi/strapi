import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export function useReviewWorkflows(params = {}) {
  const { get } = useFetchClient();

  const { id = '', ...queryParams } = params;
  const defaultQueryParams = {
    populate: 'stages',
  };

  const { data, isLoading, status, refetch } = useQuery(
    ['review-workflows', 'workflows', id],
    async () => {
      const res = await get(`/admin/review-workflows/workflows/${id}`, {
        params: { ...defaultQueryParams, ...queryParams },
      });

      return res.data;
    }
  );

  let workflows = [];

  if (id && data?.data) {
    workflows = [data.data];
  } else if (Array.isArray(data?.data)) {
    workflows = data.data;
  }

  return {
    // meta contains e.g. the total of all workflows. we can not use
    // the pagination object here, because the list is not paginated.
    meta: data?.meta ?? {},
    workflows,
    isLoading,
    status,
    refetch,
  };
}
