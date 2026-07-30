import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';

import type { Config } from '../types';
import validateSettings from './validation/admin/settings';

export default {
  async updateSettings(ctx: Context) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, FILE_MODEL_UID)) {
      return ctx.forbidden();
    }

    const data = await validateSettings(body);

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

    // Read-only echo of the app config so the admin knows how many parallel
    // upload requests it may fire. Hosting platforms that need to cap this
    // (e.g. Strapi Cloud) override the config itself.
    const { concurrentUploadSize = 1 } = strapi.config.get<Config>('plugin::upload');

    ctx.body = { data: { ...data, concurrentUploadSize } };
  },
};
