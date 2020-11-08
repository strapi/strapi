'use strict';

/**
 * Email.js controller
 *
 * @description: A set of functions called "actions" of the `email` plugin.
 */
module.exports = {
  send: async ctx => {
    let options = ctx.request.body;
    try {
      await strapi.plugins.email.services.email.send(options);
    } catch (e) {
      if (e.statusCode === 400) {
        return ctx.badRequest(e.message);
      } else {
        throw new Error(`Couldn't send email: ${e.message}.`);
      }
    }

    // Send 200 `ok`
    ctx.send({});
  },
};
