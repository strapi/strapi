import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from 'react-query';

export type Settings = {
  sizeOptimization: boolean;
  responsiveDimensions: boolean;
  autoOrientation: boolean;
  limitConcurrentUploads: boolean;
};

export const useSettings = () => {
  const { get } = useFetchClient();

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['upload', 'settings'],
    async queryFn() {
      const {
        data: { data },
      } = await get('/upload/settings');

      return data;
    },
  });

  return { data, isLoading };
};
