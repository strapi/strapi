import { defineProvider } from './provider';
import { createWebhookStore, webhookModel } from '../services/webhook-store';
import createWebhookRunner from '../services/webhook-runner';

export default defineProvider({
  init(strapi) {
    strapi.get('models').add(webhookModel);

    strapi.add('webhookStore', () => createWebhookStore({ db: strapi.db }));
    strapi.add('webhookRunner', () =>
      createWebhookRunner({
        eventHub: strapi.eventHub,
        logger: strapi.log,
        configuration: strapi.config.get('server.webhooks', {}),
        fetch: strapi.fetch,
      })
    );
  },
  async bootstrap(strapi) {
    const webhooks = await strapi.get('webhookStore').findWebhooks();
    if (!webhooks) {
      return;
    }

    for (const webhook of webhooks) {
      strapi.get('webhookRunner').add(webhook);
    }
  },
});
