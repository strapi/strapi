'use strict';

const fs = require('fs');
const { join } = require('path');
const crypto = require('crypto');

const machineId = require('../lib/utils/machine-id');

const DEFAULT_FEATURES = {
  bronze: [],
  silver: [],
  // Set a null retention duration to allow the user to override it
  // The default of 90 days is set in the audit logs service
  gold: ['sso', { name: 'audit-logs', options: { retentionDays: null } }, 'review-workflows'],
};

const publicKey = fs.readFileSync(join(__dirname, 'resources/key.pub'));

class LicenseCheckError extends Error {
  constructor(message, shouldFallback = false) {
    super(message);

    this.shouldFallback = shouldFallback;
  }
}

const readLicense = (directory) => {
  try {
    const path = join(directory, 'license.txt');
    return fs.readFileSync(path).toString();
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw Error('License file not readable, review its format and access rules.');
    }
  }
};

const verifyLicense = (license) => {
  const [signature, base64Content] = Buffer.from(license, 'base64').toString().split('\n');

  if (!signature || !base64Content) {
    throw new Error('Invalid license.');
  }

  const stringifiedContent = Buffer.from(base64Content, 'base64').toString();

  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(stringifiedContent);
  verify.end();

  const verified = verify.verify(publicKey, signature, 'base64');

  if (!verified) {
    throw new Error('Invalid license.');
  }

  const licenseInfo = JSON.parse(stringifiedContent);

  if (!licenseInfo.features) {
    licenseInfo.features = DEFAULT_FEATURES[licenseInfo.type];
  }

  Object.freeze(licenseInfo.features);
  return licenseInfo;
};

const throwError = () => {
  throw new LicenseCheckError('Could not proceed to the online validation of your license.', true);
};

const fetchLicense = async ({ strapi }, key, projectId) => {
  const response = await strapi
    .fetch(`https://license.strapi.io/api/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, projectId, deviceId: machineId() }),
    })
    .catch(throwError);

  const contentType = response.headers.get('Content-Type');

  if (contentType.includes('application/json')) {
    const { data, error } = await response.json();

    switch (response.status) {
      case 200:
        return data.license;
      case 400:
        throw new LicenseCheckError(error.message);
      case 404:
        throw new LicenseCheckError('The license used does not exists.');
      default:
        throwError();
    }
  } else {
    throwError();
  }
};

module.exports = Object.freeze({
  readLicense,
  verifyLicense,
  fetchLicense,
  LicenseCheckError,
});
