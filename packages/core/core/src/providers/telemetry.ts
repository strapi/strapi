import { defineProvider } from './provider';
import createTelemetry from '../services/metrics';

export default defineProvider({
  init(strapi) {
    strapi.add('telemetry', () => createTelemetry(strapi));
  },
  async register(strapi) {
    strapi.get('telemetry').register();
  },
  async bootstrap(strapi) {
    strapi.get('telemetry').bootstrap();
  },
  async destroy(strapi) {
    strapi.get('telemetry').destroy();
  },
});
