'use strict';

const { getService } = require('../utils');
const { ACTIONS } = require('../constants');
const validateSettings = require('./validation/settings');

const fileModel = 'plugin::upload.file';

module.exports = {
  async updateSettings(ctx) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, fileModel)) {
      return ctx.forbidden();
    }

    const data = await validateSettings(body);

    await getService('upload').setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx) {
    const {
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.readSettings, fileModel)) {
      return ctx.forbidden();
    }

    const data = await getService('upload').getSettings();

    ctx.body = { data };
  },
};
