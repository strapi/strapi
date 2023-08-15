import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export const useAuthProviders = (queryOptions = {}) => {
  const { get } = useFetchClient();

  const { data, isLoading } = useQuery(
    ['ee', 'providers'],
    async () => {
      const { data } = await get('/admin/providers');

      return data;
    },
    queryOptions
  );

  return { data, isLoading };
};
