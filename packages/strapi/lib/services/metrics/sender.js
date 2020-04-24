'use strict';

const os = require('os');

const isDocker = require('is-docker');
const { machineIdSync } = require('node-machine-id');
const fetch = require('node-fetch');
const ciEnv = require('ci-info');

/**
 * Create a send function for event with all the necessary metadatas
 * @param {Object} strapi strapi app
 * @returns {Function} (event, payload) -> Promise{boolean}
 */
module.exports = strapi => {
  const uuid = strapi.config.uuid;
  const deviceId = machineIdSync();

  const anonymous_metadata = {
    environment: strapi.config.environment,
    os: os.type(),
    osPlatform: os.platform(),
    osRelease: os.release(),
    nodeVersion: process.version,
    docker: process.env.DOCKER || isDocker(),
    isCI: ciEnv.isCI,
    version: strapi.config.info.strapi,
    strapiVersion: strapi.config.info.strapi,
  };

  return async (event, payload = {}) => {
    try {
      const res = await fetch('https://analytics.strapi.io/track', {
        method: 'POST',
        body: JSON.stringify({
          event,
          uuid,
          deviceId,
          properties: {
            ...payload,
            ...anonymous_metadata,
          },
        }),
        timeout: 1000,
        headers: { 'Content-Type': 'application/json' },
      });

      return res.ok;
    } catch (err) {
      return false;
    }
  };
};
