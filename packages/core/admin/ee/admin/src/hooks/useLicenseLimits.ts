import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

import { GetLicenseLimitInformation } from '../../../../shared/contracts/admin';

interface UseLicenseLimitsArgs {
  enabled?: boolean;
}

function useLicenseLimits({ enabled }: UseLicenseLimitsArgs = { enabled: true }) {
  const { get } = useFetchClient();
  const { data, isError, isLoading } = useQuery(
    ['ee', 'license-limit-info'],
    async () => {
      const {
        data: { data },
      } = await get<GetLicenseLimitInformation.Response>('/admin/license-limit-information');

      return data;
    },
    {
      enabled,
    }
  );

  // this needs memoization, because a default value of `{}`
  // would lead to infinite rendering loops, when used as
  // effect dependency

  type FeatureNames = GetLicenseLimitInformation.Response['data']['features'][number]['name'];

  const getFeature = React.useCallback(
    (name: FeatureNames) => {
      const feature = data?.features.find((feature) => feature.name === name);

      if (feature && 'options' in feature) {
        return feature.options;
      } else {
        return {};
      }
    },
    [data]
  );

  return { license: data, getFeature, isError, isLoading };
}

export { useLicenseLimits };
export type { UseLicenseLimitsArgs };
