'use strict';

const { validateCheckPermissionsInput } = require('../validation/permission');
const { formatActionsBySections, formatConditions } = require('./formatters');

module.exports = {
  /**
   * Check each permissions from `request.body.permissions` and returns an array of booleans
   * @param {KoaContext} ctx - koa context
   */
  async check(ctx) {
    const { body: input } = ctx.request;

    try {
      await validateCheckPermissionsInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const checkPermissions = strapi.admin.services.permission.engine.checkMany(
      ctx.state.userAbility
    );

    ctx.body = {
      data: checkPermissions(input.permissions),
    };
  },

  /**
   * Returns every permissions, in nested format
   * @param {KoaContext} ctx - koa context
   */
  async getAll(ctx) {
    const allActions = strapi.admin.services.permission.actionProvider.getAll();
    const conditions = strapi.admin.services.permission.conditionProvider.getAll();

    ctx.body = {
      data: {
        conditions: formatConditions(conditions),
        sections: formatActionsBySections(allActions),
      },
    };
  },
};
