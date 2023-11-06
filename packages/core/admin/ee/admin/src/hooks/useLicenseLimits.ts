import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

interface FeatureSSO {
  name: 'sso';
  options: undefined;
}

interface FeatureAuditLogs {
  name: 'audit-logs';
  options: undefined;
}

interface FeatureReviewWorkflows {
  name: 'review-workflows';
  options: {
    numberOfWorkflows: number;
    stagesPerWorkflow: number;
  };
}

type Feature = FeatureSSO | FeatureAuditLogs | FeatureReviewWorkflows;

// TODO: make this an API contract
interface LicenseLimitResponse {
  enforcementUserCount?: number;
  currentActiveUserCount?: number;
  permittedSeats?: number | null;
  shouldNotify?: boolean;
  shouldStopCreate?: boolean;
  licenseLimitStatus?: 'OVER_LIMIT' | 'AT_LIMIT' | null;
  isHostedOnStrapiCloud?: boolean;
  features?: Feature[];
}

export function useLicenseLimits({ enabled } = { enabled: true }) {
  const { get } = useFetchClient();
  const { data, isError, isLoading } = useQuery(
    ['ee', 'license-limit-info'],
    async () => {
      const {
        data: { data },
      } = await get<{ data: LicenseLimitResponse }>('/admin/license-limit-information');

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
    (name: Feature['name']) => {
      const feature = (license?.features ?? []).find((feature) => feature.name === name);

      return feature?.options ?? {};
    },
    [license?.features]
  );

  return { license, getFeature, isError, isLoading };
}
