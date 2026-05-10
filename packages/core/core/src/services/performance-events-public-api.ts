import type { Core, Modules } from '@strapi/types';

import {
  PERFORMANCE_HUB_EVENT_NAMES,
  PERFORMANCE_PUBLIC_SCHEMA_VERSION,
} from './performance-event-payloads';

/**
 * Stable entry point for plugins to subscribe to performance hub events (Option B in the perf spec).
 * Wraps `eventHub.on` with an extra error boundary so handler failures never reject `emit` callers.
 */
export function createPerformanceEventsPublicApi(
  strapi: Core.Strapi
): Modules.PerformanceEvents.PerformanceEventsPublicApi {
  return {
    schemaVersion: PERFORMANCE_PUBLIC_SCHEMA_VERSION,

    subscribe(eventName: string, listener: Modules.EventHub.Listener) {
      const wrapped: Modules.EventHub.Listener = async (...args) => {
        try {
          await listener(...args);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          strapi.log.warn(`performance-events: listener error for "${eventName}": ${detail}`);
        }
      };

      return strapi.eventHub.on(eventName, wrapped);
    },

    getSchemaVersion(): typeof PERFORMANCE_PUBLIC_SCHEMA_VERSION {
      return PERFORMANCE_PUBLIC_SCHEMA_VERSION;
    },

    getCapabilities() {
      return {
        schemaVersion: PERFORMANCE_PUBLIC_SCHEMA_VERSION,
        events: PERFORMANCE_HUB_EVENT_NAMES,
      };
    },
  };
}
