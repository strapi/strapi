'use strict';

const os = require('os');
const path = require('path');
const _ = require('lodash');
const { map, values, sumBy, pipe, flatMap, propEq } = require('lodash/fp');
const isDocker = require('is-docker');
const fetch = require('node-fetch');
const ciEnv = require('ci-info');
const { isUsingTypeScriptSync } = require('@strapi/typescript-utils');
const { env } = require('@strapi/utils');
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

  const serverRootPath = strapi.dirs.app.root;
  const adminRootPath = path.join(strapi.dirs.app.root, 'src', 'admin');

  const getNumberOfDynamicZones = () => {
    return pipe(
      map('attributes'),
      flatMap(values),
      sumBy(propEq('type', 'dynamiczone'))
    )(strapi.contentTypes);
  };

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
    useTypescriptOnServer: isUsingTypeScriptSync(serverRootPath),
    useTypescriptOnAdmin: isUsingTypeScriptSync(adminRootPath),
    projectId: uuid,
    isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
    numberOfAllContentTypes: _.size(strapi.contentTypes), // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
    numberOfComponents: _.size(strapi.components),
    numberOfDynamicZones: getNumberOfDynamicZones(),
  };

  addPackageJsonStrapiMetadata(anonymousGroupProperties, strapi);

  return async (event, payload = {}, opts = {}) => {
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
      ..._.merge({}, defaultQueryOpts, opts),
    };

    try {
      const res = await fetch(`${ANALYTICS_URI}/api/v2/track`, reqParams);
      return res.ok;
    } catch (err) {
      return false;
    }
  };
};
