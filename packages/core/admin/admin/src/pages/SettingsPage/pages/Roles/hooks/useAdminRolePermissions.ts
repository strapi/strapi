import { useFetchClient } from '@strapi/helper-plugin';
import { Entity } from '@strapi/types';
import { useQuery } from 'react-query';

import { RolePermissions } from '../../../../../../../shared/permissions';
import { APIBaseParams, APIResponse } from '../../../../../types/adminAPI';

export interface APIRolePermissionsQueryParams extends APIBaseParams {
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
      } = await get<APIResponse<RolePermissions>>(`/admin/roles/${id}/permissions`, {
        params: queryParams,
      });

      return data;
    },
    queryOptions
  );

  return { permissions, error, isError, isLoading, refetch };
};
