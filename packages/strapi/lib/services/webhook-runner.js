/**
 * The event hub is Strapi's event control center.
 */
'use strict';

const fetch = require('node-fetch');

class WebhookRunner {
  constructor({ eventHub }) {
    this.eventHub = eventHub;
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
    })
      .then(res => {
        console.log(res.status);
      })
      .catch(err => {
        console.log('Error', err);
      });
  }

  register(webhook) {
    const { events } = webhook;

    events.forEach(event => {
      this.eventHub.on(event, this.run.bind(this, webhook, event));
    });
  }
}

/**
 * Expose a factory function instead of the class
 */
module.exports = function createWebhookRunner(opts) {
  return new WebhookRunner(opts);
};
