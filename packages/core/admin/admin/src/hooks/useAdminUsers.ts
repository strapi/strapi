import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { Entity } from '@strapi/types';
import { useQuery } from 'react-query';

import { UserEntity } from '../../../shared/entities';
import { APIBaseParams, APIResponsePagination, APIResponseUsersLegacy } from '../types/adminAPI';

export interface APIUsersQueryParams extends APIBaseParams {
  id?: null | Entity.ID;
}

export function useAdminUsers(params: APIUsersQueryParams = {}, queryOptions = {}) {
  const { id = '', ...queryParams } = params;

  const { get } = useFetchClient();

  const { data, isError, isLoading, refetch } = useQuery(
    ['users', id, queryParams],
    async () => {
      const {
        data: { data },
      } = await get<
        APIResponseUsersLegacy<
          UserEntity | { pagination: APIResponsePagination; results: UserEntity[] }
        >
      >(`/admin/users/${id}`, {
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
    let users: UserEntity[] = [];

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
    pagination: React.useMemo(() => (data && 'pagination' in data) ?? null, [data]),
    isLoading,
    isError,
    refetch,
  };
}
