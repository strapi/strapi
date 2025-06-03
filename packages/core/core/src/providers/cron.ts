import { defineProvider } from './provider';
import createCronService from '../services/cron';

export default defineProvider({
  init(strapi) {
    strapi.add('cron', () => createCronService());
  },
  async bootstrap(strapi) {
    if (strapi.config.get('server.cron.enabled', true)) {
      const cronTasks = strapi.config.get('server.cron.tasks', {});
      strapi.get('cron').add(cronTasks);
    }

    strapi.get('cron').start();
  },
  async destroy(strapi) {
    strapi.get('cron').destroy();
  },
});
