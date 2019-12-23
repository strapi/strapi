/**
 * Webhook store is the implementation of webhook storage over the core_store
 */
'use strict';

const webhookModel = {
  uid: 'strapi::webhooks',
  internal: true,
  connection: 'default',
  globalId: 'StrapiWebhooks',
  collectionName: 'strapi_webhooks',
  info: {
    name: 'Strapi webhooks',
    description: '',
  },
  attributes: {
    name: {
      type: 'string',
    },
    url: {
      type: 'text',
    },
    headers: {
      type: 'json',
    },
    events: {
      type: 'json',
    },
    enabled: {
      type: 'boolean',
    },
  },
};

const formatWebhookInfo = webhook => {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    headers: webhook.headers,
    events: webhook.events,
    isEnabled: webhook.enabled,
  };
};

const createWebhookStore = ({ db }) => {
  const webhookQueries = db.query('strapi_webhooks');

  return {
    async findWebhooks() {
      const results = await webhookQueries.find();

      return results.map(formatWebhookInfo);
    },

    async findWebhook(id) {
      const result = await webhookQueries.findOne({ id });
      return result ? formatWebhookInfo(result) : null;
    },

    createWebhook(data) {
      const { name, url, headers, events } = data;

      const webhook = {
        name,
        url,
        headers,
        events,
        enabled: true,
      };

      return webhookQueries.create(webhook).then(formatWebhookInfo);
    },

    async updateWebhook(id, data) {
      const oldWebhook = await this.findWebhook(id);

      if (!oldWebhook) {
        throw new Error('webhook.notFound');
      }

      const { name, url, headers, events, isEnabled } = data;

      const updatedWebhook = {
        name,
        url,
        headers,
        events,
        enabled: isEnabled,
      };

      return webhookQueries
        .update({ id }, updatedWebhook)
        .then(formatWebhookInfo);
    },

    deleteWebhook(id) {
      return webhookQueries.delete({ id });
    },
  };
};

module.exports = {
  webhookModel,
  createWebhookStore,
};
