'use strict';

/**
 * Strapi telemetry package.
 * You can learn more at https://docs.strapi.io/developer-docs/latest/getting-started/usage-information.html
 */

const { scheduleJob } = require('node-schedule');

const wrapWithRateLimit = require('./rate-limiter');
const createSender = require('./sender');
const createMiddleware = require('./middleware');
const isTruthy = require('./is-truthy');

const LIMITED_EVENTS = [
  'didSaveMediaWithAlternativeText',
  'didSaveMediaWithCaption',
  'didDisableResponsiveDimensions',
  'didEnableResponsiveDimensions',
];

const createTelemetryInstance = (strapi) => {
  const uuid = strapi.config.get('uuid');
  const telemetryDisabled = strapi.config.get('packageJsonStrapi.telemetryDisabled');
  const isDisabled =
    !uuid || isTruthy(process.env.STRAPI_TELEMETRY_DISABLED) || isTruthy(telemetryDisabled);

  const crons = [];
  const sender = createSender(strapi);
  const sendEvent = wrapWithRateLimit(sender, { limitedEvents: LIMITED_EVENTS });

  return {
    get isDisabled() {
      return isDisabled;
    },

    register() {
      if (!isDisabled) {
        const pingCron = scheduleJob('0 0 12 * * *', () => sendEvent('ping'));
        crons.push(pingCron);

        strapi.server.use(createMiddleware({ sendEvent }));
      }
    },

    bootstrap() {},

    destroy() {
      // Clear open handles
      crons.forEach((cron) => cron.cancel());
    },

    async send(event, payload) {
      if (isDisabled) return true;
      return sendEvent(event, payload);
    },
  };
};

module.exports = createTelemetryInstance;
