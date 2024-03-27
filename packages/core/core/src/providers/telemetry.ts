import type { Core } from '@strapi/types';

import createTelemetry from '../services/metrics';

export default {
  init(strapi: Core.Strapi) {
    strapi.add('telemetry', () => createTelemetry(strapi));
  },
  async register(strapi: Core.Strapi) {
    strapi.get('telemetry').register();
  },
  async bootstrap(strapi: Core.Strapi) {
    strapi.get('telemetry').bootstrap();
  },
  async destroy(strapi: Core.Strapi) {
    strapi.get('telemetry').destroy();
  },
};
