import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS } from '../constants';
import { validateViewConfiguration } from './validation/admin/configureView';

export default {
  async updateViewConfiguration(ctx: Context) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.configureView)) {
      return ctx.forbidden();
    }

    const data = await validateViewConfiguration(body);

    await getService('upload').setConfiguration(data);

    ctx.body = { data };
  },

  async findViewConfiguration(ctx: Context) {
    const data = await getService('upload').getConfiguration();

    ctx.body = { data };
  },
};
