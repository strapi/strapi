/**
 * Used to store user configurations related to releases.
 * E.g the default timezone for the release schedule.
 */
import type Koa from 'koa';

import type { GetSettings, UpdateSettings, Settings } from '../../../shared/contracts/settings';
import { getService } from '../utils';
import { validateSettings } from './validation/settings';

const settingsController = {
  async find(ctx: Koa.Context) {
    // Get settings
    const settingsService = getService('settings', { strapi });
    const settings = await settingsService.find();

    // Response
    ctx.body = { data: settings } satisfies GetSettings.Response;
  },

  async update(ctx: Koa.Context) {
    // Data validation
    const settingsBody = ctx.request.body;
    const settings = (await validateSettings(settingsBody)) as Settings;

    // Update
    const settingsService = getService('settings', { strapi });
    const updatedSettings = await settingsService.update({ settings });

    // Response
    ctx.body = { data: updatedSettings } satisfies UpdateSettings.Response;
  },
};

export default settingsController;
