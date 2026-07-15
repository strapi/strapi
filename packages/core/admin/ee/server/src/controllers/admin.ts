import { isNil } from 'lodash/fp';
import { env } from '@strapi/utils';
import { getService } from '../utils';

export default {
  // NOTE: Overrides CE admin controller
  async getProjectType() {
    const flags = strapi.config.get('admin.flags', {});
    const isAILicense = strapi.ee.features.isEnabled('cms-ai');
    const isAIConfigured = strapi.config.get('admin.ai', { enabled: isAILicense });

    try {
      return {
        data: {
          isEE: strapi.EE,
          isTrial: strapi.ee.isTrial,
          features: strapi.ee.features.list(),
          flags,
          type: strapi.ee.type,
          planPriceId: strapi.ee.planPriceId,
          ai: {
            enabled: isAILicense && isAIConfigured.enabled,
          },
        },
      };
    } catch (err) {
      return { data: { isEE: false, features: [], flags, ai: { enabled: false } } };
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

    const eeInformation = await strapi.db
      .query('strapi::core-store')
      .findOne({ where: { key: 'ee_information' } })
      .then((row: { value: string } | null) => (row ? JSON.parse(row.value) : null))
      .catch(() => null);

    const licenseMode =
      strapi.ee.type === 'gold' && process.env.STRAPI_DISABLE_LICENSE_PING?.toLowerCase() === 'true'
        ? 'offline'
        : 'online';

    const data = {
      enforcementUserCount,
      currentActiveUserCount,
      permittedSeats,
      seats: strapi.ee.seats ?? null,
      subscriptionId: strapi.ee.subscriptionId ?? null,
      expireAt: strapi.ee.expireAt ?? null,
      licenseMode,
      lastRegistrySyncAt: eeInformation?.lastCheckAt ?? null,
      usingCachedLicense: Boolean(eeInformation?.error && eeInformation?.license),
      registrySyncError: eeInformation?.error ?? null,
      shouldNotify,
      shouldStopCreate: isNil(permittedSeats) ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      type: strapi.ee.type,
      isTrial: strapi.ee.isTrial,
      features: strapi.ee.features.list() ?? [],
      entitlements: strapi.ee.entitlements.list(),
    };

    return { data };
  },
};
