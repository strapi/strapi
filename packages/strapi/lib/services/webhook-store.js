/**
 * Webhook store is the implementation of webhook storage over the core_store
 */
'use strict';

const webhookModel = config => ({
  connection: config.get('database.defaultConnection'),
  uid: 'strapi::webhooks',
  globalId: 'StrapiWebhooks',
  collectionName: 'strapi_webhooks',
  info: {
    name: 'Strapi webhooks',
    description: '',
  },
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
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
});

const toDBObject = data => {
  return {
    name: data.name,
    url: data.url,
    headers: data.headers,
    events: data.events,
    enabled: data.isEnabled,
  };
};

const fromDBObject = row => {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    headers: row.headers,
    events: row.events,
    isEnabled: row.enabled,
  };
};

const createWebhookStore = ({ db }) => {
  const webhookQueries = db.query('strapi_webhooks');

  return {
    async findWebhooks() {
      const results = await webhookQueries.find();

      return results.map(fromDBObject);
    },

    async findWebhook(id) {
      const result = await webhookQueries.findOne({ id });
      return result ? fromDBObject(result) : null;
    },

    createWebhook(data) {
      return webhookQueries.create(toDBObject({ ...data, isEnabled: true })).then(fromDBObject);
    },

    async updateWebhook(id, data) {
      const webhook = await webhookQueries.update({ id }, toDBObject(data));
      return webhook ? fromDBObject(webhook) : null;
    },

    async deleteWebhook(id) {
      const webhook = await webhookQueries.delete({ id });
      return webhook ? fromDBObject(webhook) : null;
    },
  };
};

module.exports = {
  webhookModel,
  createWebhookStore,
};
