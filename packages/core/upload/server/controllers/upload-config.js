'use strict';

const { getService } = require('../utils');
const validateConfig = require('./validation/admin/settings').config;

module.exports = {
  async updateConfig(ctx) {
    // TODO Handle permissions
    const {
      request: { body },
      // state: { userAbility },
    } = ctx;

    const data = await validateConfig(body);
    await getService('upload').setConfig(data);
    ctx.body = { data };
  },

  async getConfig(ctx) {
    // TODO handle permissions
    // const {
    //   state: { userAbility },
    // } = ctx;

    // if (userAbility.cannot(ACTIONS.readSettings, FILE_MODEL_UID)) {
    //   return ctx.forbidden();
    // }

    const data = await getService('upload').getConfig();

    ctx.body = { data };
  },
};
