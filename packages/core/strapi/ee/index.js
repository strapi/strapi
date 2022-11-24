'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const _ = require('lodash');

const publicKey = fs.readFileSync(path.join(__dirname, 'resources/key.pub'));

const noop = () => {};

const noLog = {
  warn: noop,
  info: noop,
};

const internals = {};
const defaultFeatures = {
  bronze: [],
  silver: [],
  gold: ['sso'],
};

const EEService = ({ dir, logger = noLog }) => {
  if (_.has(internals, 'isEE')) return internals.isEE;

  const warnAndReturn = (msg = 'Invalid license. Starting in CE.') => {
    logger.warn(msg);
    internals.isEE = false;
    return false;
  };

  if (process.env.STRAPI_DISABLE_EE === 'true') {
    internals.isEE = false;
    return false;
  }

  const licensePath = path.join(dir, 'license.txt');

  let license;
  if (_.has(process.env, 'STRAPI_LICENSE')) {
    license = process.env.STRAPI_LICENSE;
  } else if (fs.existsSync(licensePath)) {
    license = fs.readFileSync(licensePath).toString();
  }

  if (_.isNil(license)) {
    internals.isEE = false;
    return false;
  }

  // TODO: optimistically return true if license key is valid

  try {
    const plainLicense = Buffer.from(license, 'base64').toString();
    const [signatureb64, contentb64] = plainLicense.split('\n');

    const signature = Buffer.from(signatureb64, 'base64');
    const content = Buffer.from(contentb64, 'base64').toString();

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(content);
    verifier.end();

    const isValid = verifier.verify(publicKey, signature);
    if (!isValid) return warnAndReturn();

    internals.licenseInfo = JSON.parse(content);
    internals.licenseInfo.features =
      internals.licenseInfo.features || defaultFeatures[internals.licenseInfo.type];

    const expirationTime = new Date(internals.licenseInfo.expireAt).getTime();
    if (expirationTime < new Date().getTime()) {
      return warnAndReturn('License expired. Starting in CE');
    }
  } catch (err) {
    return warnAndReturn();
  }

  internals.isEE = true;
  return true;
};

EEService.checkLicense = async () => {
  // TODO: online / DB check of the license info
  // TODO: refresh info if the DB info is outdated
  // TODO: register cron
  // internals.licenseInfo = await db.getLicense();
};

Object.defineProperty(EEService, 'licenseInfo', {
  get() {
    mustHaveKey('licenseInfo');
    return internals.licenseInfo;
  },
  configurable: false,
  enumerable: false,
});

Object.defineProperty(EEService, 'isEE', {
  get() {
    mustHaveKey('isEE');
    return internals.isEE;
  },
  configurable: false,
  enumerable: false,
});

Object.defineProperty(EEService, 'features', {
  get() {
    return {
      isEnabled(feature) {
        return internals.licenseInfo.features.includes(feature);
      },
      getEnabled() {
        return internals.licenseInfo.features;
      },
    };
  },
  configurable: false,
  enumerable: false,
});

const mustHaveKey = (key) => {
  if (!_.has(internals, key)) {
    const err = new Error('Tampering with license');
    // err.stack = null;
    throw err;
  }
};

module.exports = EEService;
