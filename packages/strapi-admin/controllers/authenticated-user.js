'use strict';

const { validateProfileUpdateInput } = require('../validation/user');

module.exports = {
  async getMe(ctx) {
    const userInfo = strapi.admin.services.user.sanitizeUser(ctx.state.user);

    ctx.body = {
      data: userInfo,
    };
  },

  async updateMe(ctx) {
    const input = ctx.request.body;

    try {
      await validateProfileUpdateInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const updatedUser = await strapi.admin.services.user.updateById(ctx.state.user.id, input);

    ctx.body = {
      data: strapi.admin.services.user.sanitizeUser(updatedUser),
    };
  },

  async getOwnPermissions(ctx) {
    const {
      findUserPermissions,
      sanitizePermission,
      mergePermissions,
    } = strapi.admin.services.permission;

    const userPermissions = await findUserPermissions(ctx.state.user);
    const mergedPermissions = await mergePermissions(userPermissions);

    ctx.body = {
      data: mergedPermissions.map(sanitizePermission),
    };
  },
};
