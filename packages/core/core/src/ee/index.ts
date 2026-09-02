import { pick, isEqual } from 'lodash/fp';
import type { Logger } from '@strapi/logger';
import type { Core } from '@strapi/types';
import { createStrapiFetch } from '../utils/fetch';
import {
  readLicense,
  verifyLicense,
  fetchLicense,
  LicenseCheckError,
  LICENSE_REGISTRY_URI,
  PLAN_FEATURE_CATALOG,
} from './license';
import { createEntitlementsRegistry } from './entitlements';
import { shiftCronExpression } from '../utils/cron';

const ONE_MINUTE = 1000 * 60;

interface LicenseInfoState {
  licenseKey?: string;
  features?: Array<{ name: string; [key: string]: any } | string>;
  expireAt?: string;
  seats?: number;
  type?: string;
  isTrial: boolean;
  subscriptionId?: string;
  planPriceId?: string;
  /** End of the subscription term, epoch milliseconds. */
  renewalDate?: number;
}

type LicenseStatus = 'none' | 'active' | 'expired' | 'unknown';

interface EE {
  enabled: boolean;
  licenseInfo: LicenseInfoState;
  /**
   * Display-only copy of the last known license, retained when a license exists but is
   * not usable (expired / could not be validated) so the admin panel can explain why.
   * NEVER read by enforcement paths (features.list/get/isEnabled, isEE) and never holds
   * the license key.
   */
  retainedLicense: Omit<LicenseInfoState, 'licenseKey'> | null;
  licenseStatus: LicenseStatus;
  logger?: Logger;
}

const ee: EE = {
  enabled: false,
  licenseInfo: {
    isTrial: false,
  },
  retainedLicense: null,
  licenseStatus: 'none',
};

const disable = (message: string, status: 'expired' | 'unknown' = 'unknown') => {
  // Prevent emitting ee.disable if it was already disabled
  const shouldEmitEvent = ee.enabled !== false;

  ee.logger?.warn(`${message} Switching to CE.`);

  // Retain a display-only snapshot (never the key) BEFORE wiping, so the admin panel can
  // still show which license this instance has and why it is unusable. Guarded on `type`
  // so a repeat disable() call cannot overwrite the snapshot with an already-wiped one.
  if (ee.licenseInfo.type) {
    ee.retainedLicense = pick(
      [
        'features',
        'expireAt',
        'seats',
        'type',
        'isTrial',
        'subscriptionId',
        'planPriceId',
        'renewalDate',
      ],
      ee.licenseInfo
    );
  }
  ee.licenseStatus = status;

  // Only keep the license key and isTrial for potential re-enabling during a later check
  ee.licenseInfo = pick(['licenseKey', 'isTrial'], ee.licenseInfo);

  ee.licenseInfo.isTrial = false;

  ee.enabled = false;

  if (shouldEmitEvent) {
    // Notify EE features that they should be disabled
    strapi.eventHub.emit('ee.disable');
  }
};

const enable = () => {
  // Prevent emitting ee.enable if it was already enabled
  const shouldEmitEvent = ee.enabled !== true;

  ee.enabled = true;
  ee.licenseStatus = 'active';
  ee.retainedLicense = null;

  if (shouldEmitEvent) {
    // Notify EE features that they should be disabled
    strapi.eventHub.emit('ee.enable');
  }
};

let initialized = false;

/**
 * Optimistically enable EE if the format of the license is valid, only run once.
 */
const init = (licenseDir: string, logger?: Logger) => {
  if (initialized) {
    return;
  }

  initialized = true;
  ee.logger = logger;

  if (process.env.STRAPI_DISABLE_EE?.toLowerCase() === 'true') {
    return;
  }

  try {
    const license = process.env.STRAPI_LICENSE || readLicense(licenseDir);

    if (license) {
      ee.licenseInfo = verifyLicense(license);
      enable();
    }
  } catch (error) {
    if (error instanceof Error) {
      disable(error.message);
    } else {
      disable('Invalid license.');
    }
  }
};

/**
 * Contact the license registry to update the license to its latest state.
 *
 * Store the result in database to avoid unecessary requests, and will fallback to that in case of a network failure.
 */
const onlineUpdate = async ({ strapi }: { strapi: Core.Strapi }) => {
  const { get, commit, rollback } = await strapi.db.transaction();
  const transaction = get();

  try {
    const storedInfo = await strapi.db
      ?.queryBuilder('strapi::core-store')
      .where({ key: 'ee_information' })
      .select('value')
      .first()
      .transacting(transaction)
      .forUpdate()
      .execute()
      .then((result: any) => (result ? JSON.parse(result.value) : result));

    const shouldContactRegistry = (storedInfo?.lastCheckAt ?? 0) < Date.now() - ONE_MINUTE;
    const result: {
      license?: string | null;
      error?: string;
      lastCheckAt?: number;
    } = { lastCheckAt: Date.now() };

    const fallback = (error: Error) => {
      if (error instanceof LicenseCheckError && error.shouldFallback && storedInfo?.license) {
        ee.logger?.warn(
          `${error.message} The last stored one will be used as a potential fallback.`
        );
        result.error = error.message; // record why we fell back so usingCachedLicense is derivable
        return storedInfo.license;
      }

      result.error = error.message;
      disable(error.message);
    };

    if (!ee?.licenseInfo?.licenseKey) {
      throw new Error('Missing license key.');
    }

    const license = shouldContactRegistry
      ? await fetchLicense({ strapi }, ee.licenseInfo.licenseKey, strapi.config.get('uuid')).catch(
          fallback
        )
      : storedInfo.license;

    if (license) {
      try {
        // Verify license and check if its info changed
        const newLicenseInfo = verifyLicense(license);
        const licenseInfoChanged =
          !isEqual(newLicenseInfo.features, ee.licenseInfo.features) ||
          newLicenseInfo.seats !== ee.licenseInfo.seats ||
          newLicenseInfo.type !== ee.licenseInfo.type;

        // Store the new license info
        ee.licenseInfo = newLicenseInfo;
        const wasEnabled = ee.enabled;
        validateInfo();

        // Notify EE features
        if (licenseInfoChanged && wasEnabled) {
          strapi.eventHub.emit('ee.update');
        }
      } catch (error) {
        if (error instanceof Error) {
          disable(error.message);
        } else {
          disable('Invalid license.');
        }
      }
    } else if (!shouldContactRegistry) {
      disable(storedInfo.error);
    }

    if (shouldContactRegistry) {
      result.license = license ?? null;
      const query = strapi.db.queryBuilder('strapi::core-store').transacting(transaction);

      if (!storedInfo) {
        query.insert({ key: 'ee_information', value: JSON.stringify(result) });
      } else {
        query.update({ value: JSON.stringify(result) }).where({ key: 'ee_information' });
      }

      await query.execute();
    }

    await commit();
  } catch {
    // Example of errors: SQLite does not support FOR UPDATE
    await rollback();
  }
};

const validateInfo = () => {
  if (typeof ee.licenseInfo.expireAt === 'undefined') {
    throw new Error('Missing license key.');
  }

  const expirationTime = new Date(ee.licenseInfo.expireAt).getTime();

  if (expirationTime < new Date().getTime()) {
    return disable('License expired.', 'expired');
  }

  enable();
};

const checkLicense = async ({ strapi }: { strapi: Core.Strapi }) => {
  const shouldStayOffline =
    ee.licenseInfo.type === 'gold' &&
    // This env variable support is temporarily used to ease the migration between online vs offline
    process.env.STRAPI_DISABLE_LICENSE_PING?.toLowerCase() === 'true';

  if (!shouldStayOffline) {
    await onlineUpdate({ strapi });

    strapi.cron.add({
      onlineUpdate: {
        task: () => onlineUpdate({ strapi }),
        options: shiftCronExpression('0 0 */12 * * *'),
      },
    });
  } else {
    if (!ee.licenseInfo.expireAt) {
      return disable('Your license does not have offline support.');
    }

    validateInfo();
  }
};

const getTrialEndDate = async ({
  strapi,
}: {
  strapi: Core.Strapi;
}): Promise<{ trialEndsAt: string } | null> => {
  const silentFetch = createStrapiFetch(strapi, {
    logs: false,
  });

  const res = await silentFetch(
    `${LICENSE_REGISTRY_URI}/api/licenses/${ee.licenseInfo.licenseKey}/trial-countdown`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).catch(() => {
    throw new LicenseCheckError(
      'Could not proceed to retrieve the trial time left for your license.',
      true
    );
  });

  const data = (await res.json()) as { trialEndsAt: string } | null;

  return data;
};

const list = () => {
  return (
    ee.licenseInfo.features?.map((feature) =>
      typeof feature === 'object' ? feature : { name: feature }
    ) || []
  );
};

const get = (featureName: string) => list().find((feature) => feature.name === featureName);

const entitlements = createEntitlementsRegistry();

export default Object.freeze({
  init,
  checkLicense,
  getTrialEndDate,

  get isEE() {
    return ee.enabled;
  },

  get licenseStatus() {
    return ee.licenseStatus;
  },

  /** Display-only; see EE.retainedLicense. Never use for feature gating. */
  get retainedLicense() {
    return ee.retainedLicense;
  },

  get seats() {
    return ee.licenseInfo.seats;
  },

  get type() {
    return ee.licenseInfo.type;
  },

  get expireAt() {
    return ee.licenseInfo.expireAt;
  },

  /** Null when the registry does not provide it yet; survives expiry via the retained snapshot. */
  get renewalDate() {
    return ee.licenseInfo.renewalDate ?? ee.retainedLicense?.renewalDate ?? null;
  },

  /**
   * Every feature the current plan supports, in display order, regardless of whether this
   * license includes it. Falls back to the retained license's type so an expired license
   * still lists rows. See `PLAN_FEATURE_CATALOG` in `./license`.
   */
  get planFeatureCatalog(): string[] {
    const type = ee.licenseInfo.type ?? ee.retainedLicense?.type;
    return type && type in PLAN_FEATURE_CATALOG
      ? PLAN_FEATURE_CATALOG[type as keyof typeof PLAN_FEATURE_CATALOG]
      : [];
  },

  get isTrial() {
    return ee.licenseInfo.isTrial;
  },

  get planPriceId() {
    return ee.licenseInfo.planPriceId;
  },

  get subscriptionId() {
    return ee.licenseInfo.subscriptionId;
  },

  features: Object.freeze({
    list,
    get,
    isEnabled: (featureName: string) => get(featureName) !== undefined,
  }),

  entitlements: Object.freeze({
    register: entitlements.register,
    // Resolvers are registered during `register()`, before the license is validated, and each
    // falls back to a built-in default when the feature is absent. Without this gate an
    // instance whose license was disabled would still report generous limits, which reads as
    // "these are your granted limits". No license, no entitlements.
    list: () => (ee.enabled ? entitlements.list() : []),
  }),
});
