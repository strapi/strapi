'use strict';

/**
 * Email.js controller
 *
 * @description: A set of functions called "actions" of the `email` plugin.
 */
module.exports = {
  send: async ctx => {
    let options = ctx.request.body;
    await strapi.plugins.email.services.email.send(options);

    // Send 200 `ok`
    ctx.send({});
  },
};
