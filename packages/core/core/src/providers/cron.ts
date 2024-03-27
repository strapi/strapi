import type { Core } from '@strapi/types';

import createCronService from '../services/cron';

export default {
  init(strapi: Core.Strapi) {
    strapi.add('cron', () => createCronService());
  },
  async bootstrap(strapi: Core.Strapi) {
    if (strapi.config.get('server.cron.enabled', true)) {
      const cronTasks = strapi.config.get('server.cron.tasks', {});
      strapi.get('cron').add(cronTasks);
    }

    strapi.get('cron').start();
  },
  async destroy(strapi: Core.Strapi) {
    strapi.get('cron').destroy();
  },
};
