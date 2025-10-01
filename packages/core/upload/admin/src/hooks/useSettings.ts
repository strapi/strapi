import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from 'react-query';

import type { GetSettings } from '../../../shared/contracts/settings';

export function useSettings(isEnabled: boolean = true) {
  const { get } = useFetchClient();

  return useQuery({
    queryKey: ['upload', 'settings'],
    enabled: isEnabled,
    async queryFn() {
      const {
        data: { data },
      } = await get<GetSettings.Response['data']>('/upload/settings');

      return data;
    },
  });
}
