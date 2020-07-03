'use strict';
/**
 * Strapi telemetry package.
 * You can learn more at https://strapi.io/documentation/v3.x/global-strapi/usage-information.html#commitment-to-our-users-data-collection
 */

const { scheduleJob } = require('node-schedule');

const wrapWithRateLimit = require('./rate-limiter');
const createSender = require('./sender');
const createMiddleware = require('./middleware');
const isTruthy = require('./is-truthy');
const ee = require('../../utils/ee');

const LIMITED_EVENTS = [
  'didSaveMediaWithAlternativeText',
  'didSaveMediaWithCaption',
  'didDisableResponsiveDimensions',
  'didEnableResponsiveDimensions',
];

const createTelemetryInstance = strapi => {
  const uuid = strapi.config.uuid;
  const isDisabled = !uuid || isTruthy(process.env.STRAPI_TELEMETRY_DISABLED);

  const sender = createSender(strapi);
  const sendEvent = wrapWithRateLimit(sender, { limitedEvents: LIMITED_EVENTS });

  if (!isDisabled) {
    scheduleJob('0 0 12 * * *', () => sendEvent('ping'));
    strapi.app.use(createMiddleware({ sendEvent }));
  }

  if (strapi.EE === true && ee.isEE === true) {
    const pingDisabled =
      isTruthy(process.env.STRAPI_LICENSE_PING_DISABLED) && ee.licenseInfo.type === 'enterprise';

    const sendLicenseCheck = () => {
      return sendEvent(
        'didCheckLicense',
        { licenseInfo: ee.licenseInfo },
        {
          headers: { 'x-strapi-project': 'enterprise' },
        }
      );
    };

    if (!pingDisabled) {
      scheduleJob('0 0 0 * * 7', () => sendLicenseCheck());
      sendLicenseCheck();
    }
  }

  return {
    async send(event, payload) {
      if (isDisabled) return true;
      return sendEvent(event, payload);
    },
  };
};

module.exports = createTelemetryInstance;
