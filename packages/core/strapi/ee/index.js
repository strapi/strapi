'use strict';

const fs = require('fs');
const { join } = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { pick } = require('lodash/fp');

const { coreStoreModel } = require('../lib/services/core-store');
const { getRecurringCronExpression } = require('../lib/utils/cron');

const ONE_MINUTE = 1000 * 60;
const DEFAULT_FEATURES = {
  bronze: [],
  silver: [],
  gold: ['sso'],
};

const publicKey = fs.readFileSync(join(__dirname, 'resources/key.pub'));

const ee = {
  enabled: false,
  licenseInfo: {},
};

const disable = (message = 'Invalid license. Starting in CE.') => {
  ee.logger?.warn(message);
  // Only keep the license key for potential re-enabling during a later check
  ee.licenseInfo = pick('licenseKey', ee.licenseInfo);
  ee.enabled = false;
};

const readLicense = (directory) => {
  try {
    const path = join(directory, 'license.txt');
    return fs.readFileSync(path).toString();
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // Permission denied, directory found instead of file, etc.
    }
  }
};

const fetchLicense = async (key, fallback) => {
  const fallbackToStoredLicense = () => {
    const error = 'Could not proceed to the online verification of your license.';

    if (fallback) {
      ee.logger(`${error} We will try to use the locally stored one as a potential fallback.`);
      return fallback;
    }

    disable(`${error} Sorry for the inconvenience. Starting in CE.`);
    return null;
  };

  try {
    const response = await fetch(`https://license.strapi.io/api/licenses/${key}`);

    if (response.status >= 500) {
      return fallbackToStoredLicense();
    }

    if (response.status >= 400) {
      disable();
      return null;
    }

    return response.text();
  } catch {
    return fallbackToStoredLicense();
  }
};

const verifyLicense = (license) => {
  const [signature, base64Content] = Buffer.from(license, 'base64').toString().split('\n');
  const stringifiedContent = Buffer.from(base64Content, 'base64').toString();

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(stringifiedContent);
  verifier.end();

  const verified = verifier.verify(publicKey, signature, 'base64');

  return { verified, licenseInfo: verified ? JSON.parse(stringifiedContent) : null };
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

  const license = process.env.STRAPI_LICENSE || readLicense(licenseDir);

  if (license) {
    const { verified, licenseInfo } = verifyLicense(license);

    if (verified) {
      ee.enabled = true; // Optimistically enable EE during initialization
      ee.licenseInfo = licenseInfo;
    } else {
      return disable();
    }
  }
};

const onlineUpdate = async (db) => {
  const transaction = await db.transaction();

  try {
    // TODO: Use the core store interface instead, it does not support transactions and "FOR UPDATE" at the moment
    const eeInfo = await db
      .queryBuilder(coreStoreModel.uid)
      .where({ key: 'ee_information' })
      .select('value')
      .first()
      .transacting(transaction)
      .forUpdate()
      .execute()
      .then((result) => (result ? JSON.parse(result.value) : result));

    const useStoredLicense = eeInfo?.lastOnlineCheck > Date.now() - ONE_MINUTE;
    const license = useStoredLicense
      ? eeInfo.license
      : await fetchLicense(ee.licenseInfo.licenseKey, eeInfo?.license);

    if (license) {
      const { verified, licenseInfo } = verifyLicense(license);

      if (verified) {
        ee.licenseInfo = licenseInfo;
      } else {
        disable();
      }
    }

    if (!useStoredLicense) {
      const value = { license, lastOnlineCheck: Date.now() };
      const query = db.queryBuilder(coreStoreModel.uid).transacting(transaction);

      if (!eeInfo) {
        query.insert({ key: 'ee_information', value: JSON.stringify(value), type: typeof value });
      } else {
        query.update({ value: JSON.stringify(value) }).where({ key: 'ee_information' });
      }

      await query.execute();
    } else if (!license) {
      disable();
    }

    await transaction.commit();
  } catch (error) {
    // The database can be locked at the time of writing, seems to just be a SQLite issue
    await transaction.rollback();
  }
};

const validateInfo = () => {
  if (!ee.licenseInfo.expireAt) {
    return;
  }

  const expirationTime = new Date(ee.licenseInfo.expireAt).getTime();

  if (expirationTime < new Date().getTime()) {
    return disable('License expired. Starting in CE.');
  }

  ee.enabled = true;

  if (!ee.licenseInfo.features) {
    ee.licenseInfo.features = DEFAULT_FEATURES[ee.licenseInfo.type];
  }
};

const recurringCheck = async ({ strapi }) => {
  await onlineUpdate(strapi.db);
  validateInfo();
};

// This env variable support is temporary to ease the migration between online vs offline
const shouldStayOffline = process.env.STRAPI_DISABLE_LICENSE_PING?.toLowerCase() === 'true';

const checkLicense = async ({ strapi }) => {
  if (!shouldStayOffline) {
    await onlineUpdate(strapi.db);
    const now = new Date();
    strapi.cron.add({ [getRecurringCronExpression(now)]: recurringCheck });
  } else if (!ee.licenseInfo.expireAt) {
    return disable('Your license does not have offline support. Starting in CE.');
  }

  validateInfo();
};

module.exports = {
  init,
  checkLicense,
  get isEE() {
    return ee.enabled;
  },
  features: {
    isEnabled: (feature) => (ee.enabled && ee.licenseInfo.features?.includes(feature)) || false,
    getEnabled: () => (ee.enabled && Object.freeze(ee.licenseInfo.features)) || [],
  },
};
