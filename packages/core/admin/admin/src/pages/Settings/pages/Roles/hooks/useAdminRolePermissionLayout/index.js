import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export const useAdminRolePermissionLayout = (id, queryOptions = {}) => {
  const { get } = useFetchClient();

  const { data, error, isError, isLoading } = useQuery(
    ['permissions', id],
    async () => {
      const {
        data: { data },
      } = await get('/admin/permissions', {
        // TODO: check with BE why we deviate from our usual admin API format here
        params: { role: id },
      });

      return data;
    },
    queryOptions
  );

  return { data, error, isError, isLoading };
};
