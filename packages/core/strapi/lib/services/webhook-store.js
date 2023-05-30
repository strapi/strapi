/**
 * Webhook store is the implementation of webhook storage over the core_store
 */

'use strict';

const { mapAsync } = require('@strapi/utils');
const { ValidationError } = require('@strapi/utils').errors;

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

const webhookEventValidator = async (allowedEvents, events) =>
  mapAsync(
    events,
    (event) => {
      if (Array.from(allowedEvents.values()).includes(event)) {
        return;
      }

      throw new ValidationError(`Webhook event ${event} is not supported`);
    },
    {}
  );

const createWebhookStore = ({ db }) => {
  const webhookQueries = db.query('webhook');

  const allowedEvents = new Map([
    ['ENTRY_CREATE', 'entry.create'],
    ['ENTRY_UPDATE', 'entry.update'],
    ['ENTRY_DELETE', 'entry.delete'],
    ['ENTRY_PUBLISH', 'entry.publish'],
    ['ENTRY_UNPUBLISH', 'entry.unpublish'],
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

    async createWebhook(data) {
      await webhookEventValidator(allowedEvents, data.events);

      return webhookQueries
        .create({
          data: toDBObject({ ...data, isEnabled: true }),
        })
        .then(fromDBObject);
    },

    async updateWebhook(id, data) {
      await webhookEventValidator(allowedEvents, data.events);

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
