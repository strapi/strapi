import { pick } from 'lodash';
import type { Context, Next } from 'koa';

import compose from 'koa-compose';
import { emitAudit, errors } from '@strapi/utils';
import { validateProviderOptionsUpdate } from '../validation/authentication';
import { middlewares, utils } from './authentication-utils';
import {
  AUDITED_EVENTS,
  getSsoSettingsChanges,
} from '../../../../server/src/audit-logs/sso-settings';
import type { EnterpriseServices } from '../../../../server/src/types';

const toProviderDTO = (provider: object) => pick(provider, ['uid', 'displayName', 'icon']);
const toProviderLoginOptionsDTO = (options: object) =>
  pick(options, ['autoRegister', 'defaultRole', 'ssoLockedRoles']);

const { ValidationError } = errors;

const providerAuthenticationFlow = compose([
  middlewares.authenticate,
  middlewares.redirectWithAuth,
]);

export default {
  async getProviders(ctx: Context) {
    const { providerRegistry } = strapi.service(
      'admin::passport'
    ) as EnterpriseServices['passport'];

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

    const changes = getSsoSettingsChanges(currentAuthOptions.providers, newAuthOptions.providers);

    if (Object.keys(changes).length > 0) {
      await emitAudit({ strapi }, AUDITED_EVENTS.SSO_SETTINGS_UPDATE, { changes });
    }

    strapi.telemetry.send('didUpdateSSOSettings');

    ctx.body = {
      data: toProviderLoginOptionsDTO(newAuthOptions.providers),
    };
  },

  providerLogin(ctx: Context, next: Next) {
    const {
      params: { provider: providerName },
    } = ctx;

    const { providerRegistry } = strapi.service(
      'admin::passport'
    ) as EnterpriseServices['passport'];

    if (!providerRegistry.has(providerName)) {
      throw new ValidationError(`Invalid provider supplied: ${providerName}`);
    }

    return providerAuthenticationFlow(ctx, next);
  },
};
