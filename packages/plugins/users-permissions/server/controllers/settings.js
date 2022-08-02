'use strict';

const _ = require('lodash');
const { ValidationError } = require('@strapi/utils').errors;
const { getService } = require('../utils');
const { isValidEmailTemplate } = require('./validation/email-template');

module.exports = {
  async getEmailTemplate(ctx) {
    ctx.send(await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'email' }).get());
  },

  async updateEmailTemplate(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    const emailTemplates = ctx.request.body['email-templates'];

    for (let key in emailTemplates) {
      const template = emailTemplates[key].options.message;

      if (!isValidEmailTemplate(template)) {
        throw new ValidationError('Invalid template');
      }
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'email' })
      .set({ value: emailTemplates });

    ctx.send({ ok: true });
  },

  async getAdvancedSettings(ctx) {
    const settings = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    const roles = await getService('role').find();

    ctx.send({ settings, roles });
  },

  async updateAdvancedSettings(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .set({ value: ctx.request.body });

    ctx.send({ ok: true });
  },

  async getProviders(ctx) {
    const providers = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get();

    for (const provider in providers) {
      if (provider !== 'email') {
        providers[provider].redirectUri = strapi
          .plugin('users-permissions')
          .service('providers')
          .buildRedirectUri(provider);
      }
    }

    ctx.send(providers);
  },

  async updateProviders(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .set({ value: ctx.request.body.providers });

    ctx.send({ ok: true });
  },
};
