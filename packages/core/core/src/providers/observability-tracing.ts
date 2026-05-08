import type { Core } from '@strapi/types';

import { defineProvider } from './provider';
import {
  attachKnexQueryTracing,
  registerOpenTelemetryTracing,
  shutdownOpenTelemetryTracing,
} from '../services/observability/opentelemetry-tracing';

export default defineProvider({
  async register(strapi: Core.Strapi) {
    registerOpenTelemetryTracing(strapi);
  },

  async bootstrap(strapi: Core.Strapi) {
    attachKnexQueryTracing(strapi);
  },

  destroy(strapi: Core.Strapi) {
    return shutdownOpenTelemetryTracing(strapi);
  },
});
