'use strict';
/**
 * Strapi telemetry package.
 * You can learn more at https://strapi.io/documentation/3.0.0-beta.x/global-strapi/usage-information.html#commitment-to-our-users-data-collection
 */
const os = require('os');

const isDocker = require('is-docker');
const { machineIdSync } = require('node-machine-id');
const fetch = require('node-fetch');
const ciEnv = require('ci-info');
const { scheduleJob } = require('node-schedule');

const createMiddleware = require('./middleware');
const isTruthy = require('./is-truthy');

const createTelemetryInstance = strapi => {
  const uuid = strapi.config.uuid;
  const deviceId = machineIdSync();

  const isDisabled = !uuid || isTruthy(process.env.STRAPI_TELEMETRY_DISABLED);

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

  const sendEvent = async (event, payload) => {
    // do not send anything when user has disabled analytics
    if (isDisabled) return true;

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

  let currentDay = new Date().getDate();
  const eventCache = new Map();

  const sendOncePerDay = async (event, payload) => {
    if (new Date().getDate() !== currentDay) {
      eventCache.clear();
      currentDay = new Date().getDate();
    }

    if (eventCache.has(event)) {
      return true;
    }

    eventCache.set(event, true);
    return sendEvent(event, payload);
  };

  if (!isDisabled) {
    scheduleJob('0 0 12 * * *', () => sendEvent('ping'));
    strapi.app.use(createMiddleware({ sendEvent }));
  }

  return {
    send: sendEvent,
    sendOncePerDay,
  };
};

module.exports = createTelemetryInstance;
