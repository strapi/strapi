import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export function useLicenseLimits({ enabled } = { enabled: true }) {
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
      enabled,
    }
  );

  // this needs memoization, because a default value of `{}`
  // would lead to infinite rendering loops, when used as
  // effect dependency
  const license = React.useMemo(() => data ?? {}, [data]);

  const getFeature = React.useCallback(
    (name) => {
      const feature = (license?.features ?? []).find((feature) => feature.name === name);

      return feature?.options ?? {};
    },
    [license?.features]
  );

  return { license, getFeature, isError, isLoading };
}
