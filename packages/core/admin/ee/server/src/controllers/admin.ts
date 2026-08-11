import { isNil } from 'lodash/fp';
import { env } from '@strapi/utils';

import type { GetLicenseLimitInformation } from '../../../../shared/contracts/admin';
import { getProjectType } from '../../../../shared/utils/get-project-type';
import { getService } from '../utils';

type PlanEntitlementLimit = { key: string; unit?: 'days' | 'count'; value: number | null };
type RetainedFeature = { name: string; [key: string]: any };

// Mirrors UNLIMITED_ENTITLEMENT_THRESHOLD in packages/core/core/src/ee/entitlements.ts (kept
// in sync manually, not imported: @strapi/admin does not depend on @strapi/core). A retained
// option value that is nullish or >= this threshold means "Unlimited", same as the live registry.
const UNLIMITED_ENTITLEMENT_THRESHOLD = 9999;

// Known feature option keys and the unit they're reported in, using the same convention as
// the entitlements registry (packages/core/core/src/ee/entitlements.ts).
const RETAINED_LIMIT_UNITS: Record<string, 'days' | 'count'> = {
  retentionDays: 'days',
  numberOfWorkflows: 'count',
  stagesPerWorkflow: 'count',
  maximumReleases: 'count',
};

const normalizeRetainedLimitValue = (value: unknown): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return value >= UNLIMITED_ENTITLEMENT_THRESHOLD ? null : value;
};

const deriveLimitsFromRetainedOptions = (
  options: Record<string, unknown> | undefined
): PlanEntitlementLimit[] => {
  if (!options) {
    return [];
  }

  return Object.entries(RETAINED_LIMIT_UNITS)
    .filter(([key]) => key in options)
    .map(([key, unit]) => ({ key, unit, value: normalizeRetainedLimitValue(options[key]) }));
};

const findRetainedFeature = (
  retainedFeatures: Array<RetainedFeature | string> | undefined,
  featureName: string
): RetainedFeature | undefined =>
  retainedFeatures
    ?.map((entry) => (typeof entry === 'string' ? { name: entry } : entry))
    .find((entry) => entry.name === featureName);

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
          licenseStatus: strapi.ee.licenseStatus,
          // Display-only: names the licensed plan even once the license is unusable, so the
          // admin can show "Enterprise / Expired" instead of silently reading as Community.
          // Never used for feature gating - isEE stays false.
          licensedPlan: getProjectType({
            isEE: strapi.ee.licenseStatus !== 'none',
            planPriceId: strapi.ee.planPriceId ?? strapi.ee.retainedLicense?.planPriceId,
          }),
          ai: {
            enabled: isAILicense && isAIConfigured.enabled,
          },
        },
      };
    } catch {
      return {
        data: {
          isEE: false,
          features: [],
          flags,
          licenseStatus: 'none' as const,
          licensedPlan: 'Community' as const,
          ai: { enabled: false },
        },
      };
    }
  },

  async licenseLimitInformation() {
    const permittedSeats = strapi.ee.seats;
    // Display-only fallback so an expired/unknown license can still show its plan, seats
    // and subscription. Never used for enforcement (permittedSeats above is untouched).
    const retained = strapi.ee.retainedLicense;
    const isActiveLicense = strapi.ee.licenseStatus === 'active';
    const activeEntitlements = strapi.ee.entitlements.list();

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

    // Registry re-check cron cadence ('0 0 */12 * * *', shifted to the startup time -> every 12h).
    const REGISTRY_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
    const lastRegistrySyncAt: number | null = eeInformation?.lastCheckAt ?? null;
    let nextRegistrySyncAt: number | null = null;
    if (licenseMode === 'online' && typeof lastRegistrySyncAt === 'number') {
      // Step forward from the last check-in in 12h increments until we land in the
      // future, so a stale last check-in never reports a "next check-in" in the past.
      const now = Date.now();
      let next = lastRegistrySyncAt + REGISTRY_CHECK_INTERVAL_MS;
      while (next <= now) {
        next += REGISTRY_CHECK_INTERVAL_MS;
      }
      nextRegistrySyncAt = next;
    }

    const data: GetLicenseLimitInformation.Response['data'] = {
      enforcementUserCount,
      currentActiveUserCount,
      permittedSeats: permittedSeats ?? null,
      seats: strapi.ee.seats ?? retained?.seats ?? null,
      subscriptionId: strapi.ee.subscriptionId ?? retained?.subscriptionId ?? null,
      expireAt: strapi.ee.expireAt ?? retained?.expireAt ?? null,
      licenseStatus: strapi.ee.licenseStatus,
      renewalDate: strapi.ee.renewalDate,
      planEntitlements: strapi.ee.planFeatureCatalog.map((feature) => {
        if (isActiveLicense) {
          return {
            feature,
            available: strapi.ee.features.isEnabled(feature),
            limits: activeEntitlements.find((entry) => entry.feature === feature)?.limits ?? [],
          };
        }

        const retainedFeature = findRetainedFeature(retained?.features, feature);

        return {
          feature,
          available: Boolean(retainedFeature),
          limits: deriveLimitsFromRetainedOptions(retainedFeature?.options),
        };
      }),
      licenseMode,
      lastRegistrySyncAt,
      nextRegistrySyncAt,
      usingCachedLicense: Boolean(eeInformation?.error && eeInformation?.license),
      registrySyncError: eeInformation?.error ?? null,
      shouldNotify,
      shouldStopCreate: isNil(permittedSeats) ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      type: strapi.ee.type ?? retained?.type ?? null,
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
