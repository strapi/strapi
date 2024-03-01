/**
 * Strapi telemetry package.
 * You can learn more at https://docs.strapi.io/developer-docs/latest/getting-started/usage-information.html
 */

import { Job, scheduleJob } from 'node-schedule';
import type { Core } from '@strapi/types';

import wrapWithRateLimit from './rate-limiter';
import createSender from './sender';
import createMiddleware from './middleware';
import isTruthy from './is-truthy';

const LIMITED_EVENTS = [
  'didSaveMediaWithAlternativeText',
  'didSaveMediaWithCaption',
  'didDisableResponsiveDimensions',
  'didEnableResponsiveDimensions',
  'didInitializePluginUpload',
];

const createTelemetryInstance = (strapi: Core.Strapi) => {
  const uuid = strapi.config.get('uuid');
  const telemetryDisabled = strapi.config.get('packageJsonStrapi.telemetryDisabled');
  const isDisabled =
    !uuid || isTruthy(process.env.STRAPI_TELEMETRY_DISABLED) || isTruthy(telemetryDisabled);

  const crons: Job[] = [];
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

    async send(event: string, payload: Record<string, unknown> = {}) {
      if (isDisabled) return true;
      return sendEvent(event, payload);
    },
  };
};

export default createTelemetryInstance;
