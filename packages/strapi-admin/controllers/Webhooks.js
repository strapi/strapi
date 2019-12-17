'use strict';

module.exports = {
  async listWebhooks(ctx) {
    const webhooks = await strapi.webhookStore.findWebhooks();
    ctx.body = { data: webhooks };
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

    ctx.body = { data: webhook };
  },

  async getWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    ctx.body = { data: webhook };
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

    ctx.body = { data: updatedWebhook };
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

  triggerWebhook(ctx) {
    ctx.body = { data: {} };
  },
};
