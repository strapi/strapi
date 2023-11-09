import * as React from 'react';

import { useCollator, useFetchClient } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import type { FindAll, FindOne } from '../../../shared/contracts/roles';

export type APIRolesQueryParams =
  | FindOne.Request['params']
  | (FindAll.Request['query'] & { id?: never });

export const useAdminRoles = (params: APIRolesQueryParams = {}, queryOptions = {}) => {
  const { id = '', ...queryParams } = params;

  const { get } = useFetchClient();
  const { locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });
  const { data, error, isError, isLoading, refetch } = useQuery(
    ['roles', id, queryParams],
    async () => {
      /**
       * TODO: can we infer if it's an array or not based on the appearance of `id`?
       */
      const { data } = await get<FindOne.Response | FindAll.Response>(`/admin/roles/${id ?? ''}`, {
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
  const roles = React.useMemo(() => {
    let roles: FindAll.Response['data'] = [];

    if (data) {
      if (Array.isArray(data.data)) {
        roles = data.data;
      } else {
        roles = [data.data];
      }
    }

    return [...roles].sort((a, b) => formatter.compare(a.name, b.name));
  }, [data, formatter]);

  return {
    roles,
    error,
    isError,
    isLoading,
    refetch,
  };
};
