import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export function useLicenseLimits(queryOptions = {}) {
  const { get } = useFetchClient();
  const { data, isError, isLoading } = useQuery(
    ['ee', 'license-limit-info'],
    async () => {
      const {
        data: { data },
      } = await get('/admin/license-limit-information');

      return data;
    },
    {
      ...queryOptions,

      // the request is expected to fail sometimes if a user does not
      // have permissions
      retry: false,
    }
  );

  const license = React.useMemo(() => {
    return data ?? {};
  }, [data]);

  const getFeature = React.useCallback(
    (name) => {
      const feature = (license?.features ?? []).find((feature) => feature.name === name);

      return feature?.options ?? {};
    },
    [license?.features]
  );

  return { license, getFeature, isError, isLoading };
}
