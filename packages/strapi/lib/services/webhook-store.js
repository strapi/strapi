/**
 * Webhook store is the implementation of webhook storage over the core_store
 */
'use strict';

const uuid = require('uuid');

module.exports = ({ db }) => ({
  async findWebhooks() {
    const row = await db.query('core_store').findOne({
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

    const res = await db.query('core_store').findOne({
      key: 'webhooks',
    });

    if (!res) {
      await db
        .query('core_store')
        .create({ key: 'webhooks', value: JSON.stringify([webhook]) });
    } else {
      await db
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

    await db
      .query('core_store')
      .update({ key: 'webhooks' }, { value: JSON.stringify(updatedWebhooks) });

    return updatedWebhook;
  },

  async deleteWebhook(id) {
    const webhooks = await this.findWebhooks();

    const updatedWebhooks = webhooks.filter(webhook => webhook.id !== id);

    await db
      .query('core_store')
      .update({ key: 'webhooks' }, { value: JSON.stringify(updatedWebhooks) });
  },
});
