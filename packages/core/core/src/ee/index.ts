import { pick, isEqual } from 'lodash/fp';
import type { Logger } from '@strapi/logger';
import type { Core } from '@strapi/types';

import { readLicense, verifyLicense, fetchLicense, LicenseCheckError } from './license';
import { shiftCronExpression } from '../utils/cron';

const ONE_MINUTE = 1000 * 60;

interface EE {
  enabled: boolean;
  licenseInfo: {
    licenseKey?: string;
    features?: Array<{ name: string; [key: string]: any } | string>;
    expireAt?: string;
    seats?: number;
    type?: string;
  };
  logger?: Logger;
}

const ee: EE = {
  enabled: false,
  licenseInfo: {},
};

const disable = (message: string) => {
  // Prevent emitting ee.disable if it was already disabled
  const shouldEmitEvent = ee.enabled !== false;

  ee.logger?.warn(`${message} Switching to CE.`);
  // Only keep the license key for potential re-enabling during a later check
  ee.licenseInfo = pick('licenseKey', ee.licenseInfo);

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
  const { get, commit, rollback } = (await strapi.db?.transaction()) as any;
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
  } catch (error) {
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
    return disable('License expired.');
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
    strapi.cron.add({ [shiftCronExpression('0 0 */12 * * *')]: onlineUpdate });
  } else {
    if (!ee.licenseInfo.expireAt) {
      return disable('Your license does not have offline support.');
    }

    validateInfo();
  }
};

const list = () => {
  return (
    ee.licenseInfo.features?.map((feature) =>
      typeof feature === 'object' ? feature : { name: feature }
    ) || []
  );
};

const get = (featureName: string) => list().find((feature) => feature.name === featureName);

export default Object.freeze({
  init,
  checkLicense,

  get isEE() {
    return ee.enabled;
  },

  get seats() {
    return ee.licenseInfo.seats;
  },

  features: Object.freeze({
    list,
    get,
    isEnabled: (featureName: string) => get(featureName) !== undefined,
  }),
});
