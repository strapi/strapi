/**
 * Strapi telemetry package.
 * You can learn more at https://docs.strapi.io/developer-docs/latest/getting-started/usage-information.html
 */

import type { Core } from '@strapi/types';

import wrapWithRateLimit from './rate-limiter';
import createSender from './sender';
import createMiddleware from './middleware';
import isTruthy from './is-truthy';
import { MCP_LIMITED_TELEMETRY_EVENTS } from '../mcp/metrics/metrics';

const LIMITED_EVENTS = [
  'didSaveMediaWithAlternativeText',
  'didSaveMediaWithCaption',
  'didDisableResponsiveDimensions',
  'didEnableResponsiveDimensions',
  'didInitializePluginUpload',
  ...Object.values(MCP_LIMITED_TELEMETRY_EVENTS),
];

const createTelemetryInstance = (strapi: Core.Strapi) => {
  const uuid = strapi.config.get('uuid');
  const telemetryDisabled = strapi.config.get('packageJsonStrapi.telemetryDisabled');
  const isDisabled =
    !uuid || isTruthy(process.env.STRAPI_TELEMETRY_DISABLED) || isTruthy(telemetryDisabled);

  // Skip the sender (and its tsUtils consumer) entirely when telemetry is off
  const sender = isDisabled ? null : createSender(strapi);
  const sendEvent = sender ? wrapWithRateLimit(sender, { limitedEvents: LIMITED_EVENTS }) : null;

  return {
    get isDisabled() {
      return isDisabled;
    },

    async register() {
      if (!isDisabled && sendEvent) {
        await strapi.cron.add({
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
      if (isDisabled || !sendEvent) return true;
      return sendEvent(event, payload);
    },

    destroy() {
      // Clean up resources if needed
    },
  };
};

export default createTelemetryInstance;
