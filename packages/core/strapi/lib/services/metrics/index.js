'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

/**
 * Strapi telemetry package.
 * You can learn more at https://strapi.io/documentation/developer-docs/latest/getting-started/usage-information.html
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { scheduleJob } = require('node-schedule');

const ee = require('../../utils/ee');
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

/**
 * @param {Strapi} strapi
 */
const createTelemetryInstance = strapi => {
  const uuid = strapi.config.get('uuid');
  const isDisabled = !uuid || isTruthy(process.env.STRAPI_TELEMETRY_DISABLED);

  /**
   * @type {Record<string, any>[]}
   */
  const crons = [];
  const sender = createSender(strapi);
  const sendEvent = wrapWithRateLimit(sender, { limitedEvents: LIMITED_EVENTS });

  return {
    register() {
      if (!isDisabled) {
        const pingCron = scheduleJob('0 0 12 * * *', () => sendEvent('ping'));
        crons.push(pingCron);

        strapi.server.use(createMiddleware({ sendEvent }));
      }
    },
    bootstrap() {
      if (strapi.EE === true && ee.isEE === true) {
        const pingDisabled =
          isTruthy(process.env.STRAPI_LICENSE_PING_DISABLED) && ee.licenseInfo.type === 'gold';

        const sendLicenseCheck = () => {
          return sendEvent(
            'didCheckLicense',
            {
              licenseInfo: {
                ...ee.licenseInfo,
                projectHash: hashProject(strapi),
                dependencyHash: hashDep(strapi),
              },
            },
            {
              headers: { 'x-strapi-project': 'enterprise' },
            }
          );
        };

        if (!pingDisabled) {
          const licenseCron = scheduleJob('0 0 0 * * 7', () => sendLicenseCheck());
          crons.push(licenseCron);

          sendLicenseCheck();
        }
      }
    },
    destroy() {
      // clear open handles
      crons.forEach(cron => cron.cancel());
    },
    /**
     *
     * @param {string} event
     * @param {any} payload
     */
    async send(event, payload) {
      if (isDisabled) return true;
      return sendEvent(event, payload);
    },
  };
};

/**
 * @param {string} str
 */
const hash = str =>
  crypto
    .createHash('sha256')
    .update(str)
    .digest('hex');

/**
 * @param {Strapi} strapi
 */
const hashProject = strapi =>
  hash(`${strapi.config.get('info.name')}${strapi.config.get('info.description')}`);

/**
 * @param {Strapi} strapi
 */
const hashDep = strapi => {
  const depStr = JSON.stringify(strapi.config.info.dependencies);
  const readmePath = path.join(strapi.dirs.root, 'README.md');

  try {
    if (fs.existsSync(readmePath)) {
      return hash(`${depStr}${fs.readFileSync(readmePath)}`);
    }
  } catch (/** @type {any} **/ err) {
    return hash(`${depStr}`);
  }

  return hash(`${depStr}`);
};

module.exports = createTelemetryInstance;
