import { useFetchClient } from '@strapi/helper-plugin';
import { Entity } from '@strapi/types';
import { useQuery } from 'react-query';

import { GetOwnPermissions } from '../../../../../../../shared/contracts/users';

export interface APIRolePermissionsQueryParams {
  id: null | Entity.ID;
}

export const useAdminRolePermissions = (
  params: APIRolePermissionsQueryParams = { id: null },
  queryOptions = {}
) => {
  const { id, ...queryParams } = params;

  const { get } = useFetchClient();

  const {
    data: permissions,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery(
    ['roles', id, 'permissions', queryParams],
    async () => {
      const {
        data: { data },
      } = await get<GetOwnPermissions.Response>(`/admin/roles/${id}/permissions`, {
        params: queryParams,
      });

      return data;
    },
    queryOptions
  );

  return { permissions, error, isError, isLoading, refetch };
};
