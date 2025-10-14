import type { Context } from 'koa';

import { getService } from '../utils';
import validateSettings from '../validation/settings';

export default {
  async updateSettings(ctx: Context) {
    const {
      request: { body },
    } = ctx;

    const data = await validateSettings(body);

    await getService('settings').setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx: Context) {
    const data = await getService('settings').getSettings();

    ctx.body = { data };
  },
};
