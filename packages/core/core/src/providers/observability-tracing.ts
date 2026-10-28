import type { Core } from '@strapi/types';

import { defineProvider } from './provider';
import { attachBcryptjsTracing } from '../services/observability/opentelemetry-bcryptjs';
import {
  attachKnexQueryTracing,
  configureOpenTelemetryTracing,
  shutdownOpenTelemetryTracing,
} from '../services/observability/opentelemetry-tracing';

export default defineProvider({
  async register(strapi: Core.Strapi) {
    configureOpenTelemetryTracing(strapi);
  },

  async bootstrap(strapi: Core.Strapi) {
    attachKnexQueryTracing(strapi);
    attachBcryptjsTracing(strapi);
  },

  destroy() {
    return shutdownOpenTelemetryTracing();
  },
});
