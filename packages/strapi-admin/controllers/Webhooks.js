'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');

const ALLOWED_EVENTS = [
  'entry.create',
  'entry.update',
  'entry.delete',
  'media.create',
  'media.delete',
];

const webhookValidator = yup
  .object({
    name: yup.string().required(),
    url: yup.string().required(),
    headers: yup.lazy(data => {
      if (typeof data !== 'object') {
        return yup.object().required();
      }

      return yup
        .object(
          _.mapValues(data, () => {
            yup
              .string()
              .min(1)
              .required();
          })
        )
        .required();
    }),
    events: yup
      .array()
      .of(
        yup
          .string()
          .oneOf(ALLOWED_EVENTS)
          .required()
      )
      .min(1)
      .required(),
  })
  .noUnknown();

const updateWebhookValidator = webhookValidator.shape({
  isEnabled: yup.boolean(),
});

module.exports = {
  async listWebhooks(ctx) {
    const webhooks = await strapi.webhookStore.findWebhooks();
    ctx.send({ data: webhooks });
  },

  async getWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    ctx.send({ data: webhook });
  },

  async createWebhook(ctx) {
    const { body } = ctx.request;

    try {
      await webhookValidator.validate(body, {
        strict: true,
        abortEarly: false,
      });
    } catch (error) {
      return ctx.badRequest('ValidationError', {
        errors: formatYupErrors(error),
      });
    }

    const webhook = await strapi.webhookStore.createWebhook(body);

    strapi.webhookRunner.add(webhook);

    ctx.created({ data: webhook });
  },

  async updateWebhook(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;

    try {
      await updateWebhookValidator.validate(body, {
        strict: true,
        abortEarly: false,
      });
    } catch (error) {
      return ctx.badRequest('ValidationError', {
        errors: formatYupErrors(error),
      });
    }

    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    const updatedWebhook = await strapi.webhookStore.updateWebhook(id, {
      ...webhook,
      ...body,
    });

    if (!updatedWebhook) {
      return ctx.notFound('webhook.notFound');
    }

    strapi.webhookRunner.update(updatedWebhook);

    ctx.send({ data: updatedWebhook });
  },

  async deleteWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    await strapi.webhookStore.deleteWebhook(id);

    strapi.webhookRunner.remove(webhook);

    ctx.body = { data: webhook };
  },

  async deleteWebhooks(ctx) {
    const { ids } = ctx.request.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return ctx.badRequest('ids must be an array of id');
    }

    for (const id of ids) {
      const webhook = await strapi.webhookStore.findWebhook(id);

      if (!webhook) continue;

      await strapi.webhookStore.deleteWebhook(id);
      strapi.webhookRunner.remove(webhook);
    }

    ctx.send({ data: ids });
  },

  async triggerWebhook(ctx) {
    const { id } = ctx.params;

    const webhook = await strapi.webhookStore.findWebhook(id);

    const response = await strapi.webhookRunner.run(
      webhook,
      'trigger-test',
      {}
    );

    ctx.body = { data: response };
  },
};
