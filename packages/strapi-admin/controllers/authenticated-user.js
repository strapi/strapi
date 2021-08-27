'use strict';

const { validateProfileUpdateInput } = require('../validation/user');
const { getService } = require('../utils');

module.exports = {
  async getMe(ctx) {
    const userInfo = getService('user').sanitizeUser(ctx.state.user);

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

    const userService = getService('user');

    const updatedUser = await userService.updateById(ctx.state.user.id, input);

    ctx.body = {
      data: userService.sanitizeUser(updatedUser),
    };
  },

  async getOwnPermissions(ctx) {
    const { findUserPermissions, sanitizePermission } = getService('permission');
    const { user } = ctx.state;

    const userPermissions = await findUserPermissions(user);

    ctx.body = {
      data: userPermissions.map(sanitizePermission),
    };
  },
};
