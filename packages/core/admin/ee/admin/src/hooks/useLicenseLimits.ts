import * as React from 'react';

import { useGetLicenseLimitsQuery } from '../../../../admin/src/services/admin';
import { GetLicenseLimitInformation } from '../../../../shared/contracts/admin';

interface UseLicenseLimitsArgs {
  enabled?: boolean;
}

function useLicenseLimits({ enabled }: UseLicenseLimitsArgs = { enabled: true }) {
  const { data, isError, isLoading } = useGetLicenseLimitsQuery(undefined, {
    skip: !enabled,
  });

  type FeatureNames = GetLicenseLimitInformation.Response['data']['features'][number]['name'];

  type GetFeatureType = <T>(name: FeatureNames) => Record<string, T> | undefined;

  const getFeature = React.useCallback<GetFeatureType>(
    (name) => {
      const feature = data?.data?.features.find((feature) => feature.name === name);

      if (feature && 'options' in feature) {
        return feature.options;
      } else {
        return {};
      }
    },
    [data]
  );

  return { license: data?.data, getFeature, isError, isLoading };
}

export { useLicenseLimits };
export type { UseLicenseLimitsArgs };
