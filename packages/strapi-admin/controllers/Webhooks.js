'use strict';

module.exports = {
  async listWebhooks(ctx) {
    const webhooks = await strapi.webhookStore.findWebhooks();
    ctx.send({ data: webhooks });
  },

  async createWebhook(ctx) {
    const { name, url, headers, events } = ctx.request.body;

    const webhook = await strapi.webhookStore.createWebhook({
      name,
      url,
      headers,
      events,
      isEnabled: true,
    });

    ctx.created({ data: webhook });
  },

  async getWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    ctx.send({ data: webhook });
  },

  async updateWebhook(ctx) {
    const { id } = ctx.params;
    const { name, url, headers, events, isEnabled } = ctx.request.body;

    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.send({ error: 'webhook.notFound' }, 404);
    }

    const updatedWebhook = await strapi.webhookStore.updateWebhook(id, {
      name,
      url,
      headers,
      events,
      isEnabled,
    });

    ctx.send({ data: updatedWebhook });
  },

  async deleteWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.send({ error: 'webhook.notFound' }, 404);
    }

    await strapi.webhookStore.deleteWebhook(id);
    ctx.body = { data: webhook };
  },

  async deleteWebhooks(ctx) {
    const { ids } = ctx.request.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return ctx.badRequest('ids must be an array of id');
    }

    for (const id of ids) {
      await strapi.webhookStore.deleteWebhook(id);
    }

    ctx.send({ data: ids });
  },

  triggerWebhook(ctx) {
    ctx.body = { data: {} };
  },
};
