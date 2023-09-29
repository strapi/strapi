import * as React from 'react';

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

  // the return value needs to be memoized, because intantiating
  // an empty array as default value would lead to an unstable return
  // value, which later on triggers infinite loops if used in the
  // dependency arrays of other hooks

  const workflows = React.useMemo(() => {
    if (id && data?.data) {
      return [data.data];
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  }, [data?.data, id]);

  return {
    // meta contains e.g. the total of all workflows. we can not use
    // the pagination object here, because the list is not paginated.
    meta: React.useMemo(() => data?.meta ?? {}, [data?.meta]),
    workflows,
    isLoading,
    status,
    refetch,
  };
}
