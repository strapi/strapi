'use strict';

const { getService } = require('../utils');
const { ACTIONS, FILE_MODEL_UID } = require('../constants');
const validateConfig = require('./validation/admin/configureView');

module.exports = {
  async updateViewConfiguration(ctx) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.configureView, FILE_MODEL_UID)) {
      return ctx.forbidden();
    }

    const data = await validateConfig(body);
    await getService('upload').setConfiguration(data);

    ctx.body = { data };
  },

  async findViewConfiguration(ctx) {
    const data = await getService('upload').getConfiguration();

    ctx.body = { data };
  },
};
