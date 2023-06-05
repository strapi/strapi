import { useQuery } from 'react-query';
import { useFetchClient } from '@strapi/helper-plugin';
import { stringify } from 'qs';

export function useAdminUsers(params = {}, queryOptions = {}) {
  const { id = '', ...queryParams } = params;
  const queryString = stringify(queryParams, { encode: false });

  const { get } = useFetchClient();

  const { data, isError, isLoading, refetch } = useQuery(
    ['users', id, queryParams],
    async () => {
      const {
        data: { data },
      } = await get(`/admin/users/${id}${queryString ? `?${queryString}` : ''}`);

      return data;
    },
    queryOptions
  );

  let users = [];

  if (id && data) {
    users = [data];
  } else if (Array.isArray(data?.results)) {
    users = data.results;
  }

  return {
    users,
    pagination: data?.pagination ?? null,
    isLoading,
    isError,
    refetch,
  };
}
