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

const isTruthyEnvVar = val => {
  if (val === null || val === undefined) return false;

  if (val === true) return true;

  if (val.toString().toLowerCase() === 'true') return true;
  if (val.toString().toLowerCase() === 'false') return false;

  if (val === 1) return true;

  return false;
};

const createTelemetryInstance = strapi => {
  const uuid = strapi.config.uuid;
  const deviceId = machineIdSync();

  const isDisabled = !uuid || isTruthyEnvVar(process.env.STRAPI_TELEMETRY_DISABLED);

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

  const _state = {
    currentDay: null,
    counter: 0,
  };

  return {
    initPing() {
      if (isDisabled) {
        return;
      }

      scheduleJob('0 0 12 * * *', () => sendEvent('ping'));
    },
    middleware: async (ctx, next) => {
      if (isDisabled) {
        return next();
      }

      const { url, method } = ctx.request;

      if (!url.includes('.') && ['GET', 'PUT', 'POST', 'DELETE'].includes(method)) {
        const dayOfMonth = new Date().getDate();

        if (dayOfMonth !== _state.currentDay) {
          _state.currentDay = dayOfMonth;
          _state.counter = 0;
        }

        // Send max. 1000 events per day.
        if (_state.counter < 1000) {
          await sendEvent('didReceiveRequest', { url: ctx.request.url });

          // Increase counter.
          _state.counter++;
        }
      }

      await next();
    },
    async send(event, properties) {
      if (isDisabled) {
        return true;
      }

      await sendEvent(event, properties);
    },
  };
};

module.exports = createTelemetryInstance;
