'use strict';

const { getService } = require('../utils');
const { ACTIONS } = require('../constants');
const validateConfig = require('./validation/admin/configureView');

module.exports = {
  async updateViewConfiguration(ctx) {
    const {
      request: { body },
      state: { userAbility },
    } = ctx;

    if (userAbility.cannot(ACTIONS.configureView)) {
      return ctx.forbidden();
    }

    const data = await validateConfig(body);
    await getService('upload').setConfiguration(data);

    ctx.body = { data };
  },

  async findViewConfiguration(ctx) {
    let data = await getService('upload').getConfiguration();
    
    if (!data) { data = { pageSize: 10, sort: "createdAt:DESC" } }
    ctx.body = { data };
  },
};
