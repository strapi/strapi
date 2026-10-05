import type { Context } from 'koa';
import _ from 'lodash';
import { errors } from '@strapi/utils';
import type { PluginContext, AdvancedSettings, GrantConfig } from '../types';
import { getService } from '../utils';
import { isValidEmailTemplate } from './validation/email-template';

const { ValidationError } = errors;

/** Create controller actions for this Strapi instance. */
export default ({ strapi }: PluginContext) => ({
  async getEmailTemplate(ctx: Context) {
    ctx.send(await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'email' }).get());
  },

  async updateEmailTemplate(ctx: Context) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    const emailTemplates = ctx.request.body['email-templates'];

    for (const key of Object.keys(emailTemplates)) {
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

  async getAdvancedSettings(ctx: Context) {
    const settings = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get()) as AdvancedSettings;

    const roles = await getService(strapi, 'role').find();

    ctx.send({ settings, roles });
  },

  async updateAdvancedSettings(ctx: Context) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .set({ value: ctx.request.body });

    ctx.send({ ok: true });
  },

  async getProviders(ctx: Context) {
    const providers = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get()) as GrantConfig;

    for (const provider in providers) {
      if (provider !== 'email') {
        Object.assign(providers[provider], {
          redirectUri: strapi
            .plugin('users-permissions')
            .service('providers')
            .buildRedirectUri(provider),
        });
      }
    }

    ctx.send(providers);
  },

  async updateProviders(ctx: Context) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .set({ value: ctx.request.body.providers });

    ctx.send({ ok: true });
  },
});
