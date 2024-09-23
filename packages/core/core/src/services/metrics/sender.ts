import os from 'os';
import path from 'path';
import _ from 'lodash';
import isDocker from 'is-docker';
import ciEnv from 'ci-info';
import tsUtils from '@strapi/typescript-utils';
import { env, machineID } from '@strapi/utils';
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

const ANALYTICS_URI = 'https://analytics.strapi.io';

/**
 * Add properties from the package.json strapi key in the metadata
 */
const addPackageJsonStrapiMetadata = (metadata: Record<string, unknown>, strapi: Core.Strapi) => {
  const { packageJsonStrapi = {} } = strapi.config;

  _.defaults(metadata, packageJsonStrapi);
};

/**
 * Create a send function for event with all the necessary metadata
 */
export default (strapi: Core.Strapi): Sender => {
  const { uuid } = strapi.config;
  const deviceId = machineID();

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

  const anonymousGroupProperties = {
    docker: process.env.DOCKER || isDocker(),
    isCI: ciEnv.isCI,
    version: strapi.config.get('info.strapi'),
    useTypescriptOnServer: tsUtils.isUsingTypeScriptSync(serverRootPath),
    useTypescriptOnAdmin: tsUtils.isUsingTypeScriptSync(adminRootPath),
    projectId: uuid,
    isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
  };

  addPackageJsonStrapiMetadata(anonymousGroupProperties, strapi);

  return async (event: string, payload: Payload = {}, opts = {}) => {
    const userId = generateAdminUserHash(strapi);

    const reqParams = {
      method: 'POST',
      body: JSON.stringify({
        event,
        userId,
        deviceId,
        eventProperties: payload.eventProperties,
        userProperties: userId ? { ...anonymousUserProperties, ...payload.userProperties } : {},
        groupProperties: {
          ...anonymousGroupProperties,
          projectType: strapi.EE ? 'Enterprise' : 'Community',
          ...payload.groupProperties,
        },
      }),
      ..._.merge({ headers: { 'X-Strapi-Event': event } }, defaultQueryOpts, opts),
    };

    try {
      const res = await strapi.fetch(`${ANALYTICS_URI}/api/v2/track`, reqParams);
      return res.ok;
    } catch (err) {
      return false;
    }
  };
};
