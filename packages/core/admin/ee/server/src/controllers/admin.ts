import { isNil } from 'lodash/fp';
import { env } from '@strapi/utils';

import { getService } from '../utils';

import type { GetProjectType } from '../../../../shared/contracts/admin';

export default {
  // NOTE: Overrides CE admin controller
  async getProjectType(): Promise<GetProjectType.Response> {
    const flags = strapi.config.get('admin.flags', {});
    const isAILicense = strapi.ee.features.isEnabled('cms-ai');
    /**
     * Read the leaf rather than the `admin.ai` branch: a user config of
     * `admin: { ai: {} }` satisfies the branch, so a default on it is never
     * applied and `enabled` would be `undefined` — which the contract forbids.
     * The leaf default matches the AI service (`admin.ai.enabled`, opt-out).
     */
    const isAIEnabledInConfig = strapi.config.get('admin.ai.enabled', true) === true;

    try {
      return {
        data: {
          // The license fields are nullable internally; the contract is not.
          isEE: Boolean(strapi.EE),
          isTrial: strapi.ee.isTrial,
          features: strapi.ee.features.list(),
          flags,
          type: strapi.ee.type ?? undefined,
          planPriceId: strapi.ee.planPriceId ?? undefined,
          ai: {
            enabled: Boolean(isAILicense) && isAIEnabledInConfig,
          },
        },
      };
    } catch {
      return { data: { isEE: false, isTrial: false, features: [], flags, ai: { enabled: false } } };
    }
  },

  async licenseLimitInformation() {
    const permittedSeats = strapi.ee.seats;

    let shouldNotify = false;
    let licenseLimitStatus = null;
    let enforcementUserCount;

    const currentActiveUserCount = await getService('user').getCurrentActiveUserCount();

    const eeDisabledUsers = await getService('seat-enforcement').getDisabledUserList();

    if (eeDisabledUsers) {
      enforcementUserCount = currentActiveUserCount + eeDisabledUsers.length;
    } else {
      enforcementUserCount = currentActiveUserCount;
    }

    if (!isNil(permittedSeats) && enforcementUserCount > permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'OVER_LIMIT';
    }

    if (!isNil(permittedSeats) && enforcementUserCount === permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'AT_LIMIT';
    }

    const data = {
      enforcementUserCount,
      currentActiveUserCount,
      permittedSeats,
      shouldNotify,
      shouldStopCreate: isNil(permittedSeats) ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      type: strapi.ee.type,
      isTrial: strapi.ee.isTrial,
      features: strapi.ee.features.list() ?? [],
    };

    return { data };
  },
};
