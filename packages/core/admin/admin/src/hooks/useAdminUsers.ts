import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { AxiosError } from 'axios';
import { UseQueryOptions, useQuery } from 'react-query';

import * as Users from '../../../shared/contracts/user';

export type APIUsersQueryParams =
  | Users.FindOne.Params
  | (Users.FindAll.Request['query'] & { id?: never });

export function useAdminUsers(
  params: APIUsersQueryParams = {},
  queryOptions: Omit<
    UseQueryOptions<
      Users.FindAll.Response['data'] | Users.FindOne.Response['data'],
      AxiosError<Required<Pick<Users.FindAll.Response | Users.FindOne.Response, 'error'>>>
    >,
    'queryKey' | 'queryFn'
  > = {}
) {
  const { id = '', ...queryParams } = params;

  const { get } = useFetchClient();

  const { data, isError, isLoading, refetch } = useQuery(
    ['users', id, queryParams],
    async () => {
      const {
        data: { data },
      } = await get<Users.FindAll.Response | Users.FindOne.Response>(`/admin/users/${id}`, {
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
    let users: Users.FindAll.Response['data']['results'] = [];

    if (data) {
      if ('results' in data) {
        if (Array.isArray(data.results)) {
          users = data.results;
        }
      } else {
        users = [data];
      }
    }

    return users;
  }, [data]);

  return {
    users,
    pagination: React.useMemo(
      () => (data && 'pagination' in data ? data.pagination ?? null : null),
      [data]
    ),
    isLoading,
    isError,
    refetch,
  };
}
