'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

const { pick, merge } = require('lodash/fp');
const compose = require('koa-compose');

const { validateProviderOptionsUpdate } = require('../validation/authentication');
const { middlewares, utils } = require('./authentication/index');

const toProviderDTO = pick(['uid', 'displayName', 'icon']);
const toProviderLoginOptionsDTO = pick(['autoRegister', 'defaultRole']);

const providerAuthenticationFlow = compose([
  middlewares.authenticate,
  middlewares.redirectWithAuth,
]);

module.exports = {
  /**
   * @param {StrapiAppContext} ctx
   */
  async getProviders(ctx) {
    const { providerRegistry } = strapi.admin.services.passport;

    ctx.body = providerRegistry.getAll().map(toProviderDTO);
  },

  /**
   * @param {StrapiAppContext} ctx
   */
  async getProviderLoginOptions(ctx) {
    const adminStore = await utils.getAdminStore();
    const { providers: providersOptions } = await adminStore.get({ key: 'auth' });

    ctx.body = {
      data: toProviderLoginOptionsDTO(providersOptions),
    };
  },

  /**
   * @param {StrapiAppContext} ctx
   */
  async updateProviderLoginOptions(ctx) {
    const {
      request: { body },
    } = ctx;

    try {
      await validateProviderOptionsUpdate(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const adminStore = await utils.getAdminStore();
    const currentAuthOptions = await adminStore.get({ key: 'auth' });
    const newAuthOptions = merge(currentAuthOptions, { providers: body });

    await adminStore.set({ key: 'auth', value: newAuthOptions });

    ctx.body = {
      data: toProviderLoginOptionsDTO(newAuthOptions.providers),
    };
  },

  /**
   * @param {StrapiAppContext} ctx
   * @param {() => Promise<void>} next
   */
  providerLogin(ctx, next) {
    const {
      params: { provider: providerName },
    } = ctx;

    const { providerRegistry } = strapi.admin.services.passport;

    if (!providerRegistry.has(providerName)) {
      throw strapi.errors.badRequest(`Invalid provider supplied: ${providerName}`);
    }

    return providerAuthenticationFlow(ctx, next);
  },
};
