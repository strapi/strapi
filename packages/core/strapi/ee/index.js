'use strict';

const fs = require('fs');
const { join } = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { pick } = require('lodash/fp');

const { coreStoreModel } = require('../lib/services/core-store');

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
  try {
    const response = await fetch(`https://license.strapi.io/api/licenses/${key}`);

    if (response.status !== 200) {
      disable();
      return null;
    }

    return response.text();
  } catch (error) {
    if (error instanceof fetch.FetchError) {
      if (fallback) {
        ee.logger(
          'Could not proceed to the online verification of your license. We will try to use your locally stored one as a potential fallback.'
        );
        return fallback;
      }

      disable(
        'Could not proceed to the online verification of your license, sorry for the inconvenience. Starting in CE.'
      );
    }

    return null;
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

const oneMinute = 1000 * 60;

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

    const useStoredLicense = eeInfo?.lastOnlineCheck > Date.now() - oneMinute;
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
    // TODO: The database can be locked at the time of writing, could just a SQLite issue only
    await transaction.rollback();
    return disable(error.message);
  }
};

const defaultFeatures = {
  bronze: [],
  silver: [],
  gold: ['sso'],
};

const validateInfo = () => {
  if (ee.licenseInfo.expireAt) {
    return;
  }

  const expirationTime = new Date(ee.licenseInfo.expireAt).getTime();

  if (expirationTime < new Date().getTime()) {
    return disable('License expired. Starting in CE.');
  }

  ee.enabled = true;

  if (!ee.licenseInfo.features) {
    ee.licenseInfo.features = defaultFeatures[ee.licenseInfo.type];
  }
};

const shouldStayOffline = process.env.STRAPI_DISABLE_LICENSE_PING?.toLowerCase() === 'true';

const checkLicense = async (db) => {
  if (!shouldStayOffline) {
    await onlineUpdate(db);
    // TODO: Register cron, try to spread it out across projects to avoid regular request spikes
  } else if (!ee.licenseInfo.expireAt) {
    return disable('Your license does not have offline support. Starting in CE.');
  }

  if (ee.enabled) {
    validateInfo();
  }
};

module.exports = {
  init,
  disable,
  features: {
    isEnabled: (feature) => (ee.enabled && ee.licenseInfo.features?.includes(feature)) || false,
    getEnabled: () => (ee.enabled && Object.freeze(ee.licenseInfo.features)) || [],
  },
  checkLicense,
  get isEE() {
    return ee.enabled;
  },
};
