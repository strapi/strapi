'use strict';

const { validateCheckPermissionsInput } = require('../validation/permission');
const { getService } = require('../utils');
const { formatConditions } = require('./formatters');

module.exports = {
  /**
   * Check each permissions from `request.body.permissions` and returns an array of booleans
   * @param {KoaContext} ctx - koa context
   */
  async check(ctx) {
    const { body: input } = ctx.request;
    const { userAbility } = ctx.state;

    await validateCheckPermissionsInput(input);

    const { engine } = getService('permission');

    const checkPermissionsFn = engine.checkMany(userAbility);

    ctx.body = {
      data: checkPermissionsFn(input.permissions),
    };
  },

  /**
   * Returns every permissions, in nested format
   * @param {KoaContext} ctx - koa context
   */
  async getAll(ctx) {
    const { sectionsBuilder, actionProvider, conditionProvider } = getService('permission');

    const actions = actionProvider.values();
    const conditions = conditionProvider.values();
    const sections = await sectionsBuilder.build(actions);

    ctx.body = {
      data: {
        conditions: formatConditions(conditions),
        sections,
      },
    };
  },
};
