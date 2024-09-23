import fs from 'fs';
import { join, resolve } from 'path';
import crypto from 'crypto';
import type { Core } from '@strapi/types';

import { machineID } from '@strapi/utils';

interface LicenseInfo {
  type: 'bronze' | 'silver' | 'gold';
  expireAt?: string;
  seats?: number;
  features?: Array<{ name: string; options?: Record<string, unknown> }>;
}

const DEFAULT_FEATURES = {
  bronze: [],
  silver: [],
  gold: [
    { name: 'sso' },
    // Set a null retention duration to allow the user to override it
    // The default of 90 days is set in the audit logs service
    { name: 'audit-logs', options: { retentionDays: null } },
    { name: 'review-workflows' },
    { name: 'cms-content-releases' },
    { name: 'cms-content-history', options: { retentionDays: 99999 } },
  ],
};

const publicKey = fs.readFileSync(resolve(__dirname, '../../resources/key.pub'));

class LicenseCheckError extends Error {
  shouldFallback = false;

  constructor(message: string, shouldFallback = false) {
    super(message);

    this.shouldFallback = shouldFallback;
  }
}

const readLicense = (directory: string) => {
  try {
    const path = join(directory, 'license.txt');
    return fs.readFileSync(path).toString();
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code !== 'ENOENT') {
      throw Error('License file not readable, review its format and access rules.');
    }
  }
};

const verifyLicense = (license: string) => {
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

  const licenseInfo: LicenseInfo = JSON.parse(stringifiedContent);

  if (!licenseInfo.features) {
    licenseInfo.features = DEFAULT_FEATURES[licenseInfo.type];
  }

  Object.freeze(licenseInfo.features);
  return licenseInfo;
};

const throwError = () => {
  throw new LicenseCheckError('Could not proceed to the online validation of your license.', true);
};

const fetchLicense = async (
  { strapi }: { strapi: Core.Strapi },
  key: string,
  projectId: string
) => {
  const response = await strapi
    .fetch(`https://license.strapi.io/api/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, projectId, deviceId: machineID() }),
    })
    .catch(throwError);

  const contentType = response.headers.get('Content-Type');

  if (contentType?.includes('application/json')) {
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

export { readLicense, verifyLicense, fetchLicense, LicenseCheckError };
