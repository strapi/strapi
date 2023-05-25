/**
 * Webhook store is the implementation of webhook storage over the core_store
 */

'use strict';

const { mapValues } = require('lodash/fp');
const { yup, validateYupSchema } = require('@strapi/utils');

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

const urlRegex =
  /^(?:([a-z0-9+.-]+):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9_]-*)*[a-z\u00a1-\uffff0-9_]+)(?:\.(?:[a-z\u00a1-\uffff0-9_]-*)*[a-z\u00a1-\uffff0-9_]+)*\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/;

const webhookValidator = (allowedEvents) =>
  yup
    .object({
      name: yup.string().required(),
      url: yup.string().matches(urlRegex, 'url must be a valid URL').required(),
      headers: yup.lazy((data) => {
        if (typeof data !== 'object') {
          return yup.object().required();
        }

        return yup
          .object(
            mapValues(() => {
              yup.string().min(1).required();
            }, data)
          )
          .required();
      }),
      events: yup.array().of(yup.string().oneOf(Array.from(allowedEvents.values())).required()),
    })
    .noUnknown();

const updateWebhookValidator = (allowedEvents) =>
  webhookValidator(allowedEvents).shape({
    id: yup.number().required(),
    isEnabled: yup.boolean().required(),
  });

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
      await validateYupSchema(webhookValidator(allowedEvents))(data);

      return webhookQueries
        .create({
          data: toDBObject({ ...data, isEnabled: true }),
        })
        .then(fromDBObject);
    },

    async updateWebhook(id, data) {
      await validateYupSchema(updateWebhookValidator(allowedEvents))(data);

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
