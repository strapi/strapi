import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export function useAdminUsers(params = {}, queryOptions = {}) {
  const { id = '', ...queryParams } = params;

  const { get } = useFetchClient();

  const { data, isError, isLoading, refetch } = useQuery(
    ['users', id, queryParams],
    async () => {
      const {
        data: { data },
      } = await get(`/admin/users/${id}`, {
        params: queryParams,
      });

      return data;
    },
    queryOptions
  );

  // the return value needs to be memoized, because intantiating
  // an empty array as default value would lead to an unstable return
  // value, which later on triggers infinite loops if used in the
  // dependency arrays of other hooks
  const users = React.useMemo(() => {
    if (id && data) {
      return [data];
    }
    if (Array.isArray(data?.results)) {
      return data.results;
    }

    return [];
  }, [data, id]);

  return {
    users,
    pagination: React.useMemo(() => data?.pagination ?? null, [data?.pagination]),
    isLoading,
    isError,
    refetch,
  };
}
