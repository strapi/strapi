/**
 * Strapi telemetry package.
 * You can learn more at https://docs.strapi.io/developer-docs/latest/getting-started/usage-information.html
 */

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

  const sender = createSender(strapi);
  const sendEvent = wrapWithRateLimit(sender, { limitedEvents: LIMITED_EVENTS });

  return {
    get isDisabled() {
      return isDisabled;
    },

    register() {
      if (!isDisabled) {
        strapi.cron.add({
          sendPingEvent: {
            task: () => sendEvent('ping'),
            options: '0 0 12 * * *',
          },
        });

        strapi.server.use(createMiddleware({ sendEvent, strapi }));
      }
    },

    bootstrap() {},

    async send(event: string, payload: Record<string, unknown> = {}) {
      if (isDisabled) return true;
      return sendEvent(event, payload);
    },

    destroy() {
      // Clean up resources if needed
    },
  };
};

export default createTelemetryInstance;
