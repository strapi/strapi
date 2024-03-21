import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';
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

    ctx.body = { data };
  },
};
