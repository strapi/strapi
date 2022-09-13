'use strict';

const { isNil, pick } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;

/**
 * Email.js controller
 *
 * @description: A set of functions called "actions" of the `email` plugin.
 */
module.exports = {
  async send(ctx) {
    const options = ctx.request.body;

    try {
      await strapi.plugin('email').service('email').send(options);
    } catch (e) {
      if (e.statusCode === 400) {
        throw new ApplicationError(e.message);
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
      throw new ApplicationError('No recipient(s) are given');
    }

    const email = {
      to,
      subject: `Strapi test mail to: ${to}`,
      text: `Great! You have correctly configured the Strapi email plugin with the ${strapi.config.get(
        'plugin.email.provider'
      )} provider. \r\nFor documentation on how to use the email plugin checkout: https://docs.strapi.io/developer-docs/latest/plugins/email.html`,
    };

    try {
      await strapi.plugin('email').service('email').send(email);
    } catch (e) {
      if (e.statusCode === 400) {
        throw new ApplicationError(e.message);
      } else {
        throw new Error(`Couldn't send test email: ${e.message}.`);
      }
    }

    // Send 200 `ok`
    ctx.send({});
  },

  async getSettings(ctx) {
    const config = strapi.plugin('email').service('email').getProviderSettings();

    ctx.send({
      config: pick(
        ['provider', 'settings.defaultFrom', 'settings.defaultReplyTo', 'settings.testAddress'],
        config
      ),
    });
  },
};
