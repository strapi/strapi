'use strict';

const { pick } = require('lodash/fp');

const { readLicense, verifyLicense, fetchLicense, LicenseCheckError } = require('./license');
const { coreStoreModel } = require('../lib/services/core-store');
const { getRecurringCronExpression } = require('../lib/utils/cron');

const ONE_MINUTE = 1000 * 60;
const DEFAULT_FEATURES = {
  bronze: [],
  silver: [],
  gold: ['sso'],
};

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

const init = (licenseDir, logger) => {
  // Can only be executed once, to prevent any abuse of the optimistic behavior
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
      ee.enabled = true; // Optimistically enable EE during initialization
    }
  } catch (error) {
    disable(error.message);
  }
};

const onlineUpdate = async ({ strapi }) => {
  const transaction = await strapi.db.transaction();

  try {
    // TODO: Use the core store interface instead, it does not support transactions and "FOR UPDATE" at the moment
    const eeInfo = await strapi.db
      .queryBuilder(coreStoreModel.uid)
      .where({ key: 'ee_information' })
      .select('value')
      .first()
      .transacting(transaction)
      .forUpdate()
      .execute()
      .then((result) => (result ? JSON.parse(result.value) : result));

    // Limit the number of requests to the license registry, especially in the case of horizontally scaled project
    const shouldContactRegistry = (eeInfo?.lastCheckAt ?? 0) < Date.now() - ONE_MINUTE;
    const value = { lastCheckAt: Date.now() };

    const fallback = (error) => {
      if (error instanceof LicenseCheckError && error.shouldFallback && eeInfo?.license) {
        ee.logger?.warn(
          `${error.message} The last stored one will be used as a potential fallback.`
        );
        return eeInfo.license;
      }

      value.error = error.message;
      disable(error.message);
    };

    const license = shouldContactRegistry
      ? await fetchLicense(ee.licenseInfo.licenseKey, strapi.config.get('uuid')).catch(fallback)
      : eeInfo.license;

    if (license) {
      try {
        ee.licenseInfo = verifyLicense(license);
        validateInfo();
      } catch (error) {
        disable(error.message);
      }
    } else if (!shouldContactRegistry) {
      // Show the latest error
      disable(eeInfo.error);
    }

    // If the registry was contacted, store the result in database, even in case of an error
    if (shouldContactRegistry) {
      const query = strapi.db.queryBuilder(coreStoreModel.uid).transacting(transaction);
      value.license = license ?? null;

      if (!eeInfo) {
        query.insert({ key: 'ee_information', value: JSON.stringify(value), type: typeof value });
      } else {
        query.update({ value: JSON.stringify(value) }).where({ key: 'ee_information' });
      }

      await query.execute();
    }

    await transaction.commit();
  } catch (error) {
    // The database can be locked at the time of writing, seems to just be a SQLite issue
    await transaction.rollback();
  }
};

const validateInfo = () => {
  const expirationTime = new Date(ee.licenseInfo.expireAt).getTime();

  if (expirationTime < new Date().getTime()) {
    return disable('License expired.');
  }

  if (!ee.licenseInfo.features) {
    ee.licenseInfo.features = DEFAULT_FEATURES[ee.licenseInfo.type];
  }

  ee.enabled = true;
  Object.freeze(ee.licenseInfo.features);
};

const checkLicense = async ({ strapi }) => {
  const shouldStayOffline =
    ee.licenseInfo.type === 'gold' &&
    // This env variable support is temporarily used to ease the migration between online vs offline
    process.env.STRAPI_DISABLE_LICENSE_PING?.toLowerCase() === 'true';

  if (!shouldStayOffline) {
    await onlineUpdate({ strapi });
    strapi.cron.add({ [getRecurringCronExpression()]: onlineUpdate });
  } else {
    if (!ee.licenseInfo.expireAt) {
      return disable('Your license does not have offline support.');
    }

    validateInfo();
  }
};

module.exports = Object.freeze({
  init,
  checkLicense,

  get isEE() {
    return ee.enabled;
  },

  features: Object.freeze({
    isEnabled: (feature) => (ee.enabled && ee.licenseInfo.features?.includes(feature)) || false,
    getEnabled: () => (ee.enabled && ee.licenseInfo.features) || [],
  }),
});
