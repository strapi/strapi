import { defineProvider } from './provider';
import { createWebhookStore, webhookModel } from '../services/webhook-store';
import createWebhookRunner from '../services/webhook-runner';
import { BODY_TEMPLATE_FUTURE_FLAG, type ContentTypes } from '../services/webhook-body';

export default defineProvider({
  init(strapi) {
    strapi.get('models').add(webhookModel);

    const isBodyTemplateEnabled = () => strapi.features.future.isEnabled(BODY_TEMPLATE_FUTURE_FLAG);
    const getContentTypes = () => strapi.contentTypes as unknown as ContentTypes;

    strapi.add('webhookStore', () =>
      createWebhookStore({ db: strapi.db, isBodyTemplateEnabled, getContentTypes })
    );
    strapi.add('webhookRunner', () =>
      createWebhookRunner({
        eventHub: strapi.eventHub,
        requestContext: strapi.requestContext,
        logger: strapi.log,
        configuration: strapi.config.get('server.webhooks', {}),
        fetch: strapi.fetch,
        isBodyTemplateEnabled,
        getContentTypes,
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
