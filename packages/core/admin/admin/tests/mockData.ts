import type { GetLicenseLimitInformation } from '../../shared/contracts/admin';

/* -------------------------------------------------------------------------------------------------
 * MOCK_DATA_EXPORTS
 * -----------------------------------------------------------------------------------------------*/

const mockData = {
  webhooks: [
    { id: 1, isEnabled: true, name: 'test', url: 'http:://strapi.io' },
    { id: 2, isEnabled: false, name: 'test2', url: 'http://me.io' },
  ],
} as const;

type MockData = typeof mockData;

/**
 * `/admin/license-limit-information` as served without a license: no seat limit, no trial,
 * no feature.
 */
const communityLicenseLimits = {
  currentActiveUserCount: 1,
  enforcementUserCount: 1,
  shouldNotify: false,
  shouldStopCreate: false,
  licenseLimitStatus: null,
  isHostedOnStrapiCloud: false,
  isTrial: false,
  features: [],
} satisfies GetLicenseLimitInformation.Response['data'];

export { mockData, communityLicenseLimits };
export type { MockData };
