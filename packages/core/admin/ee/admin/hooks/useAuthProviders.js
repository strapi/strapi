import * as React from 'react';

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

  // the return value needs to be memoized, because a fresh
  // instantiated array would cause an infinite rendering loop
  // when used as an effect dependency
  const providers = React.useMemo(() => data ?? [], [data]);

  return { providers, isLoading };
};
