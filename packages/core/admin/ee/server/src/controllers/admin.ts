import { env } from '@strapi/utils';

import type {
  GetLicenseLimitInformation,
  GetProjectType,
} from '../../../../shared/contracts/admin';
import { getService } from '../utils';

type RetainedFeature = { name: string; [key: string]: any };

const findRetainedFeature = (
  retainedFeatures: Array<RetainedFeature | string> | undefined,
  featureName: string
): RetainedFeature | undefined =>
  retainedFeatures
    ?.map((entry) => (typeof entry === 'string' ? { name: entry } : entry))
    .find((entry) => entry.name === featureName);

export default {
  // NOTE: Overrides CE admin controller
  async getProjectType(): Promise<GetProjectType.Response> {
    const flags = strapi.config.get('admin.flags', {});

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
            enabled: strapi.ai.admin.isStrapiManagedAiEnabled(),
          },
        },
      };
    } catch {
      return { data: { isEE: false, isTrial: false, features: [], flags, ai: { enabled: false } } };
    }
  },

  async licenseLimitInformation() {
    const permittedSeats = strapi.ee.seats;
    // Display-only fallback so an expired/unknown license can still show its plan, seats
    // and subscription. Never used for enforcement (permittedSeats above is untouched).
    const retained = strapi.ee.retainedLicense;
    const isActiveLicense = strapi.ee.licenseStatus === 'active';
    const activeEntitlements = strapi.ee.entitlements.list();
    // A lapsed license resolves through the same resolvers against its retained snapshot, so the
    // card shows the defaulted, clamped limits the plan enforced rather than raw options.
    const retainedEntitlements = isActiveLicense ? [] : strapi.ee.entitlements.listRetained();

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

    if (permittedSeats != null && enforcementUserCount > permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'OVER_LIMIT';
    }

    if (permittedSeats != null && enforcementUserCount === permittedSeats) {
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
              errorKind?: 'unreachable' | 'rejected';
              lastCheckAt?: number;
            })
          : null
      )
      .catch(() => null);

    // disable() wipes the live type on expiry but keeps it on the retained snapshot, so resolve
    // it once here: an expired offline gold license must still report `offline` (and show its
    // real expiry) rather than the online check-in line.
    const licenseType = strapi.ee.type ?? retained?.type ?? null;
    const licenseMode: 'online' | 'offline' =
      licenseType === 'gold' && process.env.STRAPI_DISABLE_LICENSE_PING?.toLowerCase() === 'true'
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
      planPriceId: strapi.ee.planPriceId ?? retained?.planPriceId ?? null,
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
          limits: retainedFeature
            ? (retainedEntitlements.find((entry) => entry.feature === feature)?.limits ?? [])
            : [],
        };
      }),
      licenseMode,
      lastRegistrySyncAt,
      nextRegistrySyncAt,
      usingCachedLicense: Boolean(eeInformation?.error && eeInformation?.license),
      registrySyncError: eeInformation?.error ?? null,
      registrySyncErrorKind: eeInformation?.errorKind ?? null,
      shouldNotify,
      shouldStopCreate: permittedSeats == null ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      type: licenseType,
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
