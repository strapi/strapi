'use strict';

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

    const webhook = await strapi.webhookStore.createWebhook(body);

    strapi.webhookRunner.add(webhook);

    ctx.created({ data: webhook });
  },

  async updateWebhook(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;

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

      // eslint-disable-next-line no-continue
      if (!webhook) continue;

      await strapi.webhookStore.deleteWebhook(id);
      strapi.webhookRunner.remove(webhook);
    }

    ctx.send({ data: ids });
  },

  async triggerWebhook(ctx) {
    const { id } = ctx.params;

    const webhook = await strapi.webhookStore.findWebhook(id);

    const response = await strapi.webhookRunner.run(webhook, 'trigger-test', {});

    ctx.body = { data: response };
  },
};
