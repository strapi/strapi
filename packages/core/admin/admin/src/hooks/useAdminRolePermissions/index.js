import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export const useAdminRolePermissions = (params = {}, queryOptions = {}) => {
  const { id, ...queryParams } = params;

  const { get } = useFetchClient();

  if (!id && (queryOptions?.enabled === undefined || !!queryOptions?.enabled === true)) {
    throw new Error('"id" is a required argument');
  }

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
      } = await get(`/admin/roles/${id}/permissions`, {
        params: queryParams,
      });

      return data;
    },
    queryOptions
  );

  return { permissions, error, isError, isLoading, refetch };
};
