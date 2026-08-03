import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';

import type { Config } from '../types';
import validateSettings, { settingsSchema } from './validation/admin/settings';

// The stored settings' known keys. `GET /upload/settings` echoes read-only
// config (e.g. `concurrentUploadRequests`) alongside them, and the legacy
// Settings page PUTs the whole payload back — narrowing to these keys keeps
// those echoes out of the store. Derived from the schema so it can't drift.
const SETTINGS_KEYS = Object.keys(settingsSchema.fields);

export default {
  async updateSettings(ctx: Context) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, FILE_MODEL_UID)) {
      return ctx.forbidden();
    }

    const validated = await validateSettings(body);
    const source = validated as Record<string, unknown>;
    const data = Object.fromEntries(
      SETTINGS_KEYS.filter((key) => key in source).map((key) => [key, source[key]])
    ) as typeof validated;

    await getService('upload').setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx: Context) {
    const {
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, FILE_MODEL_UID)) {
      return ctx.forbidden();
    }

    const data = await getService('upload').getSettings();

    // Read-only echo of the app config so the admin knows how many upload
    // requests it may fire in parallel. Distinct from `concurrentUploadSize`,
    // which is the server-side per-request processing ceiling. Deployments that
    // need to bound this override the config.
    const { concurrentUploadRequests = 1 } = strapi.config.get<Config>('plugin::upload');

    ctx.body = { data: { ...data, concurrentUploadRequests } };
  },
};
