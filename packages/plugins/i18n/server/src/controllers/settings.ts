import type { Context } from 'koa';

import { getService } from '../utils';
import { getStrapi } from '../utils/strapi-ref';
import validateSettings from '../validation/settings';

// Controllers stay plain objects: user extensions patch `plugin.controllers.<name>.<action>` in
// place (see __tests__/plugin-shape.test.ts), so actions read `strapi` at call time.

export default {
  async updateSettings(ctx: Context) {
    const strapi = getStrapi();
    const {
      request: { body },
    } = ctx;

    const data = await validateSettings(body);

    await getService('settings', { strapi }).setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx: Context) {
    const strapi = getStrapi();
    const settings = await getService('settings', { strapi }).getSettings();

    ctx.body = {
      data: {
        ...settings,
        aiLocalizationsAvailable: getService('ai-translations', { strapi }).hasProvider(),
      },
    };
  },
};
