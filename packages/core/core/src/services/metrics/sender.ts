import os from 'os';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import isDocker from 'is-docker';
import ciEnv from 'ci-info';
import tsUtils from '@strapi/typescript-utils';
import { env, generateInstallId } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { generateAdminUserHash } from './admin-user-hash';

export interface Payload {
  eventProperties?: Record<string, unknown>;
  userProperties?: Record<string, unknown>;
  groupProperties?: Record<string, unknown>;
}

export type Sender = (
  event: string,
  payload?: Payload,
  opts?: Record<string, unknown>
) => Promise<boolean>;

const defaultQueryOpts = {
  timeout: 1000,
  headers: { 'Content-Type': 'application/json' },
};

/**
 * Add properties from the package.json strapi key in the metadata
 */
const addPackageJsonStrapiMetadata = (metadata: Record<string, unknown>, strapi: Core.Strapi) => {
  const { packageJsonStrapi = {} } = strapi.config;

  _.defaults(metadata, packageJsonStrapi);
};

/**
 * Build licenseInfo from strapi.ee for telemetry
 */
const buildLicenseInfo = (strapi: Core.Strapi): Record<string, unknown> | undefined => {
  // If EE is not enabled, don't include license info
  if (!strapi.EE || !strapi.ee?.isEE) {
    return undefined;
  }

  // Decode the license to extract licenseKey, planPriceId, subscriptionId, and other fields
  let licenseKey: string | null = null;
  let planPriceId: string | null = null;
  let subscriptionId: string | null = null;
  let expireAt: string | null = null;
  let customerId: string | null = null;

  try {
    let licenseContent: string | null = null;

    // Try environment variable first
    licenseContent = env('STRAPI_LICENSE', null) || null;

    // If not in env, try to read from license file
    if (!licenseContent) {
      const licensePath = path.join(strapi.dirs.app.root, 'license.txt');
      if (fs.existsSync(licensePath)) {
        licenseContent = fs.readFileSync(licensePath, 'utf8');
      }
    }

    // Decode the license to extract the fields
    if (licenseContent && licenseContent.trim()) {
      try {
        // License format: base64 encoded with signature and content separated by newline
        const decoded = Buffer.from(licenseContent, 'base64').toString();
        const base64Content = decoded.split('\n')[1];

        if (base64Content) {
          // Decode the inner base64 content to get the JSON string
          const stringifiedContent = Buffer.from(base64Content, 'base64').toString();
          const decodedLicenseInfo = JSON.parse(stringifiedContent);

          // Extract the fields from the decoded license JSON
          licenseKey = decodedLicenseInfo.licenseKey || null;
          planPriceId = decodedLicenseInfo.planPriceId || null;
          subscriptionId = decodedLicenseInfo.subscriptionId || null;
          customerId = decodedLicenseInfo.customerId || null;

          // Convert expireAt timestamp to ISO string if it's a number
          if (decodedLicenseInfo.expireAt) {
            if (typeof decodedLicenseInfo.expireAt === 'number') {
              expireAt = new Date(decodedLicenseInfo.expireAt).toISOString();
            } else {
              expireAt = decodedLicenseInfo.expireAt;
            }
          }
        }
      } catch (decodeError) {
        // If decoding fails, ignore
      }
    }
  } catch (e) {
    // Ignore errors
  }

  // If we have a license key (EE is enabled), build license info
  if (licenseKey) {
    const projectId = String(strapi.config.get('uuid') || '');

    // Extract license type from planPriceId (e.g., "growth" from "growth-v2-USD-Monthly")
    // or fallback to strapi.ee.type
    let licenseType: string | null = null;

    if (planPriceId) {
      // Extract the plan name from planPriceId (e.g., "growth" from "growth-v2-USD-Monthly")
      const planMatch = planPriceId.match(/^(growth|enterprise|bronze|silver|gold)/i);
      if (planMatch) {
        licenseType = planMatch[1].toLowerCase();
      }
    }

    // If we don't have type from planPriceId, try to get from strapi.ee
    if (!licenseType) {
      try {
        licenseType = strapi.ee.type || null;
      } catch (e) {
        // Ignore errors
      }
    }

    // Normalize license type - handle growth and enterprise types
    if (licenseType === 'growth' || licenseType === 'enterprise') {
      // Keep as is
    } else if (!licenseType || !['bronze', 'silver', 'gold'].includes(licenseType)) {
      // Default to enterprise if type is not standard
      licenseType = 'enterprise';
    }

    // Use default expireAt if not found
    if (!expireAt) {
      expireAt = new Date().toISOString();
    }

    // Use customerId from decoded license, or fallback to projectId
    const finalCustomerId = customerId || projectId;

    return {
      customerId: finalCustomerId,
      subscriptionId: subscriptionId || undefined,
      licenseKey,
      type: (licenseType as 'bronze' | 'silver' | 'gold' | 'growth' | 'enterprise') || 'enterprise',
      isTrial: strapi.ee.isTrial || false,
      expireAt,
    };
  }

  return undefined;
};

/**
 * Create a send function for event with all the necessary metadata
 */
export default (strapi: Core.Strapi): Sender => {
  const { uuid, installId: installIdFromPackageJson } = strapi.config;

  const installId = generateInstallId(uuid, installIdFromPackageJson);

  const serverRootPath = strapi.dirs.app.root;
  const adminRootPath = path.join(strapi.dirs.app.root, 'src', 'admin');

  const anonymousUserProperties = {
    environment: strapi.config.environment,
    os: os.type(),
    osPlatform: os.platform(),
    osArch: os.arch(),
    osRelease: os.release(),
    nodeVersion: process.versions.node,
  };

  const anonymousGroupProperties: Record<string, unknown> = {
    docker: process.env.DOCKER || isDocker(),
    isCI: ciEnv.isCI,
    version: strapi.config.get('info.strapi'),
    useTypescriptOnServer: tsUtils.isUsingTypeScriptSync(serverRootPath),
    useTypescriptOnAdmin: tsUtils.isUsingTypeScriptSync(adminRootPath),
    projectId: uuid,
    isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
    aiLicenseKey: env('STRAPI_ADMIN_AI_LICENSE', null),
  };

  // Add license information if available
  const licenseInfo = buildLicenseInfo(strapi);
  if (licenseInfo) {
    anonymousGroupProperties.licenseInfo = licenseInfo;
  }

  addPackageJsonStrapiMetadata(anonymousGroupProperties, strapi);

  return async (event: string, payload: Payload = {}, opts = {}) => {
    console.log(strapi.EE);
    const userId = generateAdminUserHash(strapi);

    const reqParams = {
      method: 'POST',
      body: JSON.stringify({
        event,
        userId,
        installId,
        eventProperties: payload.eventProperties,
        userProperties: userId ? { ...anonymousUserProperties, ...payload.userProperties } : {},
        groupProperties: {
          ...anonymousGroupProperties,
          projectType: (() => {
            if (!strapi.EE) {
              return 'Community';
            }
            return strapi.ee?.type === 'growth' ? 'Growth' : 'Enterprise';
          })(),
          ...payload.groupProperties,
        },
      }),
      ..._.merge({ headers: { 'X-Strapi-Event': event } }, defaultQueryOpts, opts),
    };

    try {
      const analyticsUrl = env('STRAPI_ANALYTICS_URL', 'https://analytics.strapi.io');
      const res = await strapi.fetch(`${analyticsUrl}/api/v2/track`, reqParams);
      return res.ok;
    } catch (err) {
      return false;
    }
  };
};
