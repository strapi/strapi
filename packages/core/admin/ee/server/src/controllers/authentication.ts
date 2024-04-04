import type { Context, Next } from 'koa';

import { pick } from 'lodash/fp';
import compose from 'koa-compose';
import { errors } from '@strapi/utils';
import { validateProviderOptionsUpdate } from '../validation/authentication';
import { middlewares, utils } from './authentication-utils';

const toProviderDTO = pick(['uid', 'displayName', 'icon']);
const toProviderLoginOptionsDTO = pick(['autoRegister', 'defaultRole', 'ssoLockedRoles']);

const { ValidationError } = errors;

const providerAuthenticationFlow = compose([
  middlewares.authenticate,
  middlewares.redirectWithAuth,
]);

export default {
  async getProviders(ctx: Context) {
    const { providerRegistry } = strapi.service('admin::passport');

    ctx.body = providerRegistry.getAll().map(toProviderDTO);
  },

  async getProviderLoginOptions(ctx: Context) {
    const adminStore = await utils.getAdminStore();
    const { providers: providersOptions } = (await adminStore.get({ key: 'auth' })) as any;

    ctx.body = {
      data: toProviderLoginOptionsDTO(providersOptions),
    };
  },

  async updateProviderLoginOptions(ctx: Context) {
    const {
      request: { body },
    } = ctx;

    await validateProviderOptionsUpdate(body);

    const adminStore = await utils.getAdminStore();
    const currentAuthOptions = (await adminStore.get({ key: 'auth' })) as any;
    const newAuthOptions = { ...currentAuthOptions, providers: body };
    await adminStore.set({ key: 'auth', value: newAuthOptions });

    strapi.telemetry.send('didUpdateSSOSettings');

    ctx.body = {
      data: toProviderLoginOptionsDTO(newAuthOptions.providers),
    };
  },

  providerLogin(ctx: Context, next: Next) {
    const {
      params: { provider: providerName },
    } = ctx;

    const { providerRegistry } = strapi.service('admin::passport');

    if (!providerRegistry.has(providerName)) {
      throw new ValidationError(`Invalid provider supplied: ${providerName}`);
    }

    return providerAuthenticationFlow(ctx, next);
  },
};
