'use strict';

const { isNil, pick } = require('lodash/fp');

/**
 * Email.js controller
 *
 * @description: A set of functions called "actions" of the `email` plugin.
 */
module.exports = {
  async send(ctx) {
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

  async test(ctx) {
    const { to } = ctx.request.body;

    if (isNil(to)) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: 'Email.to.empty', message: 'No recipient(s) are given' }],
      });
    }

    const email = {
      to: to,
      subject: `Strapi test mail to: ${to}`,
      text: `Great! You have correctly configured the Strapi email plugin with the ${strapi.plugins.email.config.provider} provider. \r\nFor documentation on how to use the email plugin checkout: https://strapi.io/documentation/developer-docs/latest/development/plugins/email.html`,
    };

    try {
      await strapi.plugins.email.services.email.send(email);
    } catch (e) {
      if (e.statusCode === 400) {
        return ctx.badRequest(e.message);
      } else {
        throw new Error(`Couldn't send test email: ${e.message}.`);
      }
    }

    // Send 200 `ok`
    ctx.send({});
  },

  async getSettings(ctx) {
    const config = strapi.plugins.email.services.email.getProviderSettings();

    ctx.send({
      config: pick(
        ['provider', 'settings.defaultFrom', 'settings.defaultReplyTo', 'settings.testAddress'],
        config
      ),
    });
  },
};
