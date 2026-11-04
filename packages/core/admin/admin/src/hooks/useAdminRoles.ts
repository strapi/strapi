import * as React from 'react';

import { useCollator } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { GetRolesParams, useGetRolesQuery } from '../services/users';

import type { FindRoles } from '../../../shared/contracts/roles';

export type AdminRole = FindRoles.Response['data'][number];

export const useAdminRoles = (
  params: GetRolesParams = {},
  queryOptions?: Parameters<typeof useGetRolesQuery>[1]
) => {
  const { locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const { data, error, isError, isLoading, refetch } = useGetRolesQuery(params, queryOptions);

  // the return value needs to be memoized, because intantiating
  // an empty array as default value would lead to an unstable return
  // value, which later on triggers infinite loops if used in the
  // dependency arrays of other hooks
  const roles = React.useMemo(
    () =>
      [...(data ?? [])].sort((a, b) =>
        formatter.compare(a.name, b.name)
      ) as FindRoles.Response['data'],
    [data, formatter]
  );

  return {
    roles,
    error,
    isError,
    isLoading,
    refetch,
  };
};
