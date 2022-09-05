'use strict';

const os = require('os');
const path = require('path');
const _ = require('lodash');
const isDocker = require('is-docker');
const fetch = require('node-fetch');
const ciEnv = require('ci-info');
const { isUsingTypeScriptSync } = require('@strapi/typescript-utils');
const ee = require('../../utils/ee');
const machineID = require('../../utils/machine-id');
const { generateAdminUserHash } = require('./admin-user-hash');

const defaultQueryOpts = {
  timeout: 1000,
  headers: { 'Content-Type': 'application/json' },
};

const ANALYTICS_URI = 'https://analytics.strapi.io';

/**
 * Add properties from the package.json strapi key in the metadata
 * @param {object} metadata
 */
const addPackageJsonStrapiMetadata = (metadata, strapi) => {
  const { packageJsonStrapi = {} } = strapi.config;

  _.defaults(metadata, packageJsonStrapi);
};

/**
 * Create a send function for event with all the necessary metadatas
 * @param {Object} strapi strapi app
 * @returns {Function} (event, payload) -> Promise{boolean}
 */
module.exports = (strapi) => {
  const { uuid } = strapi.config;
  const deviceId = machineID();
  const isEE = strapi.EE === true && ee.isEE === true;

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
    projectType: isEE ? 'Enterprise' : 'Community',
    useTypescriptOnServer: isUsingTypeScriptSync(serverRootPath),
    useTypescriptOnAdmin: isUsingTypeScriptSync(adminRootPath),
    projectId: uuid,
  };

  addPackageJsonStrapiMetadata(anonymousGroupProperties, strapi);

  return async (event, payload = {}, opts = {}) => {
    const adminUserId = generateAdminUserHash(payload);

    const reqParams = {
      method: 'POST',
      body: JSON.stringify({
        event,
        adminUserId,
        deviceId,
        eventProperties: payload.eventProperties,
        userProperties: { ...anonymousUserProperties, ...payload.userProperties },
        groupProperties: {
          ...anonymousGroupProperties,
          ...payload.groupProperties,
        },
      }),
      ..._.merge({}, defaultQueryOpts, opts),
    };

    try {
      const res = await fetch(`${ANALYTICS_URI}/track`, reqParams);
      return res.ok;
    } catch (err) {
      return false;
    }
  };
};
