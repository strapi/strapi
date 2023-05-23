/**
 * Webhook store is the implementation of webhook storage over the core_store
 */

'use strict';

const webhookModel = {
  uid: 'webhook',
  collectionName: 'strapi_webhooks',
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

const toDBObject = (data) => {
  return {
    name: data.name,
    url: data.url,
    headers: data.headers,
    events: data.events,
    enabled: data.isEnabled,
  };
};

const fromDBObject = (row) => {
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
  const webhookQueries = db.query('webhook');

  // TODO: Use a Map
  const allowedEvents = new Map([
    ['ENTRY_CREATE', 'entry.create'],
    ['ENTRY_UPDATE', 'entry.update'],
    ['ENTRY_DELETE', 'entry.delete'],
    ['ENTRY_PUBLISH', 'entry.publish'],
    ['ENTRY_UNPUBLISH', 'entry.unpublish'],
    ['MEDIA_CREATE', 'media.create'],
    ['MEDIA_UPDATE', 'media.update'],
    ['MEDIA_DELETE', 'media.delete'],
  ]);

  return {
    allowedEvents,
    async findWebhooks() {
      const results = await webhookQueries.findMany();

      return results.map(fromDBObject);
    },

    async findWebhook(id) {
      const result = await webhookQueries.findOne({ where: { id } });
      return result ? fromDBObject(result) : null;
    },

    createWebhook(data) {
      // TODO: Validate webhook event
      return webhookQueries
        .create({
          data: toDBObject({ ...data, isEnabled: true }),
        })
        .then(fromDBObject);
    },

    async updateWebhook(id, data) {
      // TODO: Validate webhook event
      const webhook = await webhookQueries.update({
        where: { id },
        data: toDBObject(data),
      });

      return webhook ? fromDBObject(webhook) : null;
    },

    async deleteWebhook(id) {
      const webhook = await webhookQueries.delete({ where: { id } });
      return webhook ? fromDBObject(webhook) : null;
    },
  };
};

module.exports = {
  webhookModel,
  createWebhookStore,
};
