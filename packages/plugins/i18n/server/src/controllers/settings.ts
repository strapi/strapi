import type { Context } from 'koa';

import { getService } from '../utils';
import validateSettings from '../validation/settings';

// TODO @Nico Controllers stay plain objects and read the global `strapi`: user extensions patch
// `plugin.controllers.<name>.<action>` on the raw plugin object before core resolves factories, so a
// factory would break them (see __tests__/plugin-shape.test.ts).

export default {
  async updateSettings(ctx: Context) {
    const {
      request: { body },
    } = ctx;

    const data = await validateSettings(body);

    await getService('settings', { strapi }).setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx: Context) {
    const settings = await getService('settings', { strapi }).getSettings();

    ctx.body = {
      data: {
        ...settings,
        aiLocalizationsAvailable: getService('ai-translations', { strapi }).hasProvider(),
      },
    };
  },
};
