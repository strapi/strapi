'use strict';

const { pick } = require('lodash/fp');

const { readLicense, verifyLicense, fetchLicense, LicenseCheckError } = require('./license');
const { shiftCronExpression } = require('../lib/utils/cron');

const ONE_MINUTE = 1000 * 60;

const ee = {
  enabled: false,
  licenseInfo: {},
};

const disable = (message) => {
  ee.logger?.warn(`${message} Switching to CE.`);
  // Only keep the license key for potential re-enabling during a later check
  ee.licenseInfo = pick('licenseKey', ee.licenseInfo);
  ee.enabled = false;
};

let initialized = false;

/**
 * Optimistically enable EE if the format of the license is valid, only run once.
 */
const init = (licenseDir, logger) => {
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
      ee.enabled = true;
    }
  } catch (error) {
    disable(error.message);
  }
};

/**
 * Contact the license registry to update the license to its latest state.
 *
 * Store the result in database to avoid unecessary requests, and will fallback to that in case of a network failure.
 */
const onlineUpdate = async ({ strapi }) => {
  const { get, commit, rollback } = await strapi.db.transaction();
  const transaction = get();

  try {
    const storedInfo = await strapi.db
      .queryBuilder('strapi::core-store')
      .where({ key: 'ee_information' })
      .select('value')
      .first()
      .transacting(transaction)
      .forUpdate()
      .execute()
      .then((result) => (result ? JSON.parse(result.value) : result));

    const shouldContactRegistry = (storedInfo?.lastCheckAt ?? 0) < Date.now() - ONE_MINUTE;
    const result = { lastCheckAt: Date.now() };

    const fallback = (error) => {
      if (error instanceof LicenseCheckError && error.shouldFallback && storedInfo?.license) {
        ee.logger?.warn(
          `${error.message} The last stored one will be used as a potential fallback.`
        );
        return storedInfo.license;
      }

      result.error = error.message;
      disable(error.message);
    };

    const license = shouldContactRegistry
      ? await fetchLicense(ee.licenseInfo.licenseKey, strapi.config.get('uuid')).catch(fallback)
      : storedInfo.license;

    if (license) {
      try {
        ee.licenseInfo = verifyLicense(license);
        validateInfo();
      } catch (error) {
        disable(error.message);
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
  const expirationTime = new Date(ee.licenseInfo.expireAt).getTime();

  if (expirationTime < new Date().getTime()) {
    return disable('License expired.');
  }

  ee.enabled = true;
};

const checkLicense = async ({ strapi }) => {
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

const get = (featureName) => list().find((feature) => feature.name === featureName);

module.exports = Object.freeze({
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
    isEnabled: (featureName) => get(featureName) !== undefined,
  }),
});
