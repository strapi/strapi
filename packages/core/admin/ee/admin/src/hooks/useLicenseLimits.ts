import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';

import { GetLicenseLimitInformation } from '../../../../shared/contracts/admin';

interface UseLicenseLimitsArgs {
  enabled?: boolean;
}

function useLicenseLimits({ enabled }: UseLicenseLimitsArgs = { enabled: true }) {
  const { get } = useFetchClient();
  const { data, isError, isLoading } = useQuery<
    GetLicenseLimitInformation.Response,
    AxiosError<GetLicenseLimitInformation.Response['error']>
  >(
    ['ee', 'license-limit-info'],
    async () => {
      const { data } = await get<GetLicenseLimitInformation.Response>(
        '/admin/license-limit-information'
      );

      return data;
    },
    {
      enabled,
    }
  );

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
