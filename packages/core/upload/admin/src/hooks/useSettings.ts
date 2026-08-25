import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from '@tanstack/react-query';

import type { GetSettings } from '../../../shared/contracts/settings';

export function useSettings(isEnabled: boolean = true) {
  const { get } = useFetchClient();

  // v4: disabled queries report isLoading=true; isInitialLoading matches v3 isLoading.
  const query = useQuery({
    queryKey: ['upload', 'settings'],
    enabled: isEnabled,
    async queryFn() {
      const {
        data: { data },
      } = await get<GetSettings.Response['data']>('/upload/settings');

      return data;
    },
  });

  return {
    ...query,
    isLoading: query.isInitialLoading,
  };
}
