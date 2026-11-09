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
        requestContext: strapi.requestContext,
        logger: strapi.log,
        configuration: strapi.config.get('server.webhooks', {}),
        fetch: strapi.fetch,
      })
    );
  },
  async bootstrap(strapi) {
    // Created even when there are no webhooks, so that an invalid `server.webhooks` configuration
    // stops Strapi at startup instead of when a webhook is first used
    const webhookRunner = strapi.get('webhookRunner');
    const webhooks = await strapi.get('webhookStore').findWebhooks();
    if (!webhooks) {
      return;
    }

    for (const webhook of webhooks) {
      webhookRunner.add(webhook);
    }
  },
});
