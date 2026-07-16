import { isNil } from 'lodash/fp';
import { env } from '@strapi/utils';
import type { GetLicenseLimitInformation } from '../../../../shared/contracts/admin';
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
      .then((row: { value: string } | null) =>
        row
          ? (JSON.parse(row.value) as {
              license?: string | null;
              error?: string;
              lastCheckAt?: number;
            })
          : null
      )
      .catch(() => null);

    const licenseMode: 'online' | 'offline' =
      strapi.ee.type === 'gold' && process.env.STRAPI_DISABLE_LICENSE_PING?.toLowerCase() === 'true'
        ? 'offline'
        : 'online';

    // Registry re-check cron cadence ('0 0 */12 * * *').
    const REGISTRY_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
    const lastRegistrySyncAt: number | null = eeInformation?.lastCheckAt ?? null;
    const nextRegistrySyncAt =
      licenseMode === 'online' && typeof lastRegistrySyncAt === 'number'
        ? lastRegistrySyncAt + REGISTRY_CHECK_INTERVAL_MS
        : null;

    const data: GetLicenseLimitInformation.Response['data'] = {
      enforcementUserCount,
      currentActiveUserCount,
      permittedSeats: permittedSeats ?? null,
      seats: strapi.ee.seats ?? null,
      subscriptionId: strapi.ee.subscriptionId ?? null,
      expireAt: strapi.ee.expireAt ?? null,
      licenseMode,
      lastRegistrySyncAt,
      nextRegistrySyncAt,
      usingCachedLicense: Boolean(eeInformation?.error && eeInformation?.license),
      registrySyncError: eeInformation?.error ?? null,
      shouldNotify,
      shouldStopCreate: isNil(permittedSeats) ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      type: strapi.ee.type ?? null,
      isTrial: strapi.ee.isTrial,
      // `features.list()` is loosely typed at the source (`{ name: string; [k]: any }[]`);
      // narrow it to the contract's named-feature union so consumers (e.g. useLicenseLimits) keep their types.
      features: (strapi.ee.features.list() ??
        []) as GetLicenseLimitInformation.Response['data']['features'],
      entitlements: strapi.ee.entitlements.list(),
    };

    return { data } satisfies GetLicenseLimitInformation.Response;
  },
};
