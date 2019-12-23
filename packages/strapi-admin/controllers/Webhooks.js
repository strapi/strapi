'use strict';

module.exports = {
  async listWebhooks(ctx) {
    const webhooks = await strapi.webhookStore.findWebhooks();
    ctx.send({ data: webhooks });
  },

  async createWebhook(ctx) {
    const { name, url, headers, events } = ctx.request.body;

    // TODO: validate input

    const webhook = await strapi.webhookStore.createWebhook({
      name,
      url,
      headers,
      events,
    });

    strapi.webhookRunner.add(webhook);

    ctx.created({ data: webhook });
  },

  async getWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    ctx.send({ data: webhook });
  },

  async updateWebhook(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;

    const webhook = await strapi.webhookStore.findWebhook(id);

    // TODO: validate input

    if (!webhook) {
      return ctx.send({ error: 'webhook.notFound' }, 404);
    }

    const updatedWebhook = {
      ...webhook,
      ...body,
    };

    await strapi.webhookStore.updateWebhook(id, updatedWebhook);

    strapi.webhookRunner.update(webhook);

    ctx.send({ data: updatedWebhook });
  },

  async deleteWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.send({ error: 'webhook.notFound' }, 404);
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
