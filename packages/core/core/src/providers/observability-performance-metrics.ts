import type { Core } from '@strapi/types';

import {
  attachPerformanceMetricsHubListeners,
  registerOpenTelemetryPerformanceMetrics,
  shutdownOpenTelemetryPerformanceMetrics,
} from '../services/observability/opentelemetry-performance-metrics';
import { defineProvider } from './provider';

let disposeHub: (() => void) | null = null;

export default defineProvider({
  async register(strapi: Core.Strapi) {
    registerOpenTelemetryPerformanceMetrics(strapi);
  },

  async bootstrap(strapi: Core.Strapi) {
    disposeHub = attachPerformanceMetricsHubListeners(strapi);
  },

  destroy(strapi: Core.Strapi) {
    disposeHub?.();
    disposeHub = null;
    return shutdownOpenTelemetryPerformanceMetrics(strapi);
  },
});
