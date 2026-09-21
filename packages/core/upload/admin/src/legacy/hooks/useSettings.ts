import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from '@tanstack/react-query';

import type { GetSettings } from '../../../../shared/contracts/settings';

export function useSettings(isEnabled: boolean = true) {
  const { get } = useFetchClient();

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
    // v4 reports disabled empty queries as loading. Gate that state by `enabled` while preserving
    // v3's loading state when an enabled offline-first query pauses between retries.
    isLoading: isEnabled && query.isLoading,
    status: !isEnabled && query.status === 'loading' ? ('idle' as const) : query.status,
  };
}
