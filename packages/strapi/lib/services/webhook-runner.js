/**
 * The event hub is Strapi's event control center.
 */
'use strict';

const fetch = require('node-fetch');

class WebhookRunner {
  constructor({ eventHub, logger }) {
    this.eventHub = eventHub;
    this.logger = logger;
  }

  run(webhook, event, info = {}) {
    const { url, headers } = webhook;

    return fetch(url, {
      method: 'post',
      body: JSON.stringify({
        event,
        created_at: new Date(),
        data: info,
      }),
      headers: {
        ...headers,
        'X-Strapi-Event': event,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
      .then(res => {
        this.logger.info(res.status);
      })
      .catch(err => {
        this.logger.error('Error', err);
      });
  }

  register(webhooks) {
    webhooks.forEach(webhook => {
      const { events } = webhook;

      events.forEach(event => {
        this.eventHub.on(event, info => this.run(webhook, event, info));
      });
    });
  }
}

/**
 * Expose a factory function instead of the class
 */
module.exports = function createWebhookRunner(opts) {
  return new WebhookRunner(opts);
};
