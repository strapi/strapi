'use strict';

/**
 * Email.js controller
 *
 * @description: A set of functions called "actions" of the `email` plugin.
 */
module.exports = {
  send: async ctx => {
    // Verify if the file email is enable.
    if (strapi.plugins.email.enabled === false) {
      strapi.log.error('Email is disabled');
      return ctx.badRequest(null, [
        {
          messages: [{ id: 'Email.status.disabled', message: 'Emails disabled' }],
        },
      ]);
    }

    // Something is wrong
    if (ctx.status === 400) {
      return;
    }

    let options = ctx.request.body;

    await strapi.plugins.email.services.email.send(options);

    // Send 200 `ok`
    ctx.send({});
  },
};
