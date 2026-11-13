import type Koa from 'koa';
import type { Core } from '@strapi/types';

import type { SettingsResponse } from '../../../../shared/contracts/settings';
import { PLUGIN_ID } from '../../constants';
import type { AuthEngine } from '../../engine/types';
import type compatService from '../../services/compat';
import type settingsService from '../../services/settings';

/** Better Auth's id for the plugin that checks a password against known breaches */
const BREACHED_CHECK_PLUGIN = 'have-i-been-pwned';

/**
 * `/end-users/settings`: the settings document, and what the admin needs to draw it (the methods
 * installed in code, whether the breached-password check is, and `config/plugins.ts` read-only).
 * Answers are `{ data, meta }`.
 */
const settingsController = ({ strapi }: { strapi: Core.Strapi }) => {
  const settings = () =>
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>;

  const respond = async (data: SettingsResponse['data']): Promise<SettingsResponse> => {
    const engine = strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;
    const config = settings().configSummary();

    // Only while the mode is on: with it off there is nothing to count
    if (config.compat.usersPermissions) {
      config.compat.legacyJwtHits = await (
        strapi.plugin(PLUGIN_ID).service('compat') as ReturnType<typeof compatService>
      ).legacyJwtHits();
    }

    return {
      data,
      meta: {
        installedMethods: engine.installedMethods(),
        breachedCheckInstalled: config.auth.plugins.includes(BREACHED_CHECK_PLUGIN),
        config,
      },
    };
  };

  return {
    async find(ctx: Koa.Context) {
      ctx.body = await respond(await settings().get());
    },

    async update(ctx: Koa.Context) {
      ctx.body = await respond(await settings().set(ctx.request.body));
    },
  };
};

export default settingsController;
