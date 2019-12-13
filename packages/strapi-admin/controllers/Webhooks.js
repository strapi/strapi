'use strict';

// TODO: install uuid
const uuid = require('uuid');

const webhookHandler = {
  async findWebhooks() {
    const row = await strapi.query('core_store').findOne({
      key: 'webhooks',
    });

    return row ? JSON.parse(row.value) : [];
  },

  async findWebhook(id) {
    const webhooks = await this.findWebhooks();
    return webhooks.find(hook => hook.id === id);
  },

  async createWebhook(data) {
    const webhooks = await this.findWebhooks();

    const webhook = {
      id: uuid(),
      ...data,
    };

    const res = await strapi.query('core_store').findOne({
      key: 'webhooks',
    });

    if (!res) {
      await strapi
        .query('core_store')
        .create({ key: 'webhooks', value: JSON.stringify([webhook]) });
    } else {
      await strapi
        .query('core_store')
        .update(
          { key: 'webhooks' },
          { value: JSON.stringify(webhooks.concat(webhook)) }
        );
    }

    return webhook;
  },

  async updateWebhook(id, data) {
    const oldWebhook = await this.findWebhook(id);
    const webhooks = await this.findWebhooks();

    const updatedWebhook = {
      ...oldWebhook,
      ...data,
    };

    const updatedWebhooks = webhooks.map(webhook => {
      if (webhook.id === id) {
        return updatedWebhook;
      }

      return webhook;
    });

    await strapi
      .query('core_store')
      .update({ key: 'webhooks' }, { value: JSON.stringify(updatedWebhooks) });

    return updatedWebhook;
  },

  async deleteWebhook(id) {
    const webhooks = await this.findWebhooks();

    const updatedWebhooks = webhooks.filter(webhook => webhook.id !== id);

    await strapi
      .query('core_store')
      .update({ key: 'webhooks' }, { value: JSON.stringify(updatedWebhooks) });
  },
};

module.exports = {
  async listWebhooks(ctx) {
    const webhooks = await webhookHandler.findWebhooks();
    ctx.body = { data: webhooks };
  },

  async createWebhook(ctx) {
    const { name, url, headers, events } = ctx.request.body;

    const webhook = await webhookHandler.createWebhook({
      name,
      url,
      headers,
      events,
    });

    ctx.body = { data: webhook };
  },

  async getWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await webhookHandler.findWebhook(id);

    ctx.body = { data: webhook };
  },

  async updateWebhook(ctx) {
    const { id } = ctx.params;
    const { name, url, headers, events } = ctx.request.body;

    const webhook = await webhookHandler.findWebhook(id);

    if (!webhook) {
      return ctx.send({ error: 'webhook.notFound' }, 404);
    }

    const updatedWebhook = await webhookHandler.updateWebhook(id, {
      name,
      url,
      headers,
      events,
    });

    ctx.body = { data: updatedWebhook };
  },

  async deleteWebhook(ctx) {
    const { id } = ctx.params;
    const webhook = await webhookHandler.findWebhook(id);

    if (!webhook) {
      return ctx.send({ error: 'webhook.notFound' }, 404);
    }

    await webhookHandler.deleteWebhook(id);
    ctx.body = { data: webhook };
  },

  triggerWebhook(ctx) {
    ctx.body = { data: {} };
  },
};
