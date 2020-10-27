'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const _ = require('lodash');

const publicKey = fs.readFileSync(path.join(__dirname, '../utils/resources/key.pub'));

const noop = () => {};

const noLog = {
  warn: noop,
  info: noop,
};

const internals = {};

module.exports = ({ dir, logger = noLog }) => {
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

    if (internals.licenseInfo.expireAt < new Date().getTime()) {
      return warnAndReturn('License expired. Starting in CE');
    }
  } catch (err) {
    return warnAndReturn();
  }

  internals.isEE = true;
  return true;
};

Object.defineProperty(module.exports, 'licenseInfo', {
  get: () => {
    mustHaveKey('licenseInfo');
    return internals.licenseInfo;
  },
  configurable: false,
  enumerable: false,
});

Object.defineProperty(module.exports, 'isEE', {
  get: () => {
    mustHaveKey('isEE');
    return internals.isEE;
  },
  configurable: false,
  enumerable: false,
});

const mustHaveKey = key => {
  if (!_.has(internals, key)) {
    const err = new Error('Tampering with license');
    err.stack = null;
    throw err;
  }
};
