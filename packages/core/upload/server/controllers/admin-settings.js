'use strict';

const { getService } = require('../utils');
const { ACTIONS, FILE_MODEL_UID } = require('../constants');
const validateSettings = require('./validation/admin/settings').settings;

module.exports = {
  async updateSettings(ctx) {
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

  async getSettings(ctx) {
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
