/**
 * Webhook store is the implementation of webhook storage over the core_store
 *
 */
'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 * @typedef {import('@strapi/strapi').Webhook} Webhook
 */

/**
 * @template T
 * @typedef {import('@strapi/database').Entity<T>} Entity<T>
 */

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

/**
 * @param {Omit<Webhook, 'enabled'> & { isEnabled: boolean}} data
 * @returns {Webhook}
 */
const toDBObject = data => {
  return {
    name: data.name,
    url: data.url,
    headers: data.headers,
    events: data.events,
    enabled: data.isEnabled,
  };
};

/**
 * @param {Entity<Webhook>} row
 * @returns {Entity<Omit<Webhook, 'enabled'> & { isEnabled: boolean}>}
 */
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

/**
 * @param {{ db: Strapi['db'] }} strapi
 */
const createWebhookStore = ({ db }) => {
  const webhookQueries = db.query('webhook');

  return {
    async findWebhooks() {
      const results = await webhookQueries.findMany();

      return results.map(fromDBObject);
    },

    /**
     * @param {string} id
     */
    async findWebhook(id) {
      const result = await webhookQueries.findOne({ where: { id } });
      return result ? fromDBObject(result) : null;
    },

    /**
     * @param {Omit<Webhook, 'enabled'> & { isEnabled: boolean}} data
     */
    createWebhook(data) {
      return webhookQueries
        .create({
          data: toDBObject({ ...data, isEnabled: true }),
        })
        .then(fromDBObject);
    },

    /**
     * @param {string} id
     * @param {Omit<Webhook, 'enabled'> & { isEnabled: boolean}} data
     */
    async updateWebhook(id, data) {
      const webhook = await webhookQueries.update({
        where: { id },
        data: toDBObject(data),
      });

      return webhook ? fromDBObject(webhook) : null;
    },

    /**
     * @param {string} id
     */
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
