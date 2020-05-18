'use strict';

const { validateProfileUpdateInput } = require('../validation/user');

module.exports = {
  async getMe(ctx) {
    if (!ctx.state.user || !ctx.state.isAuthenticatedAdmin) {
      return ctx.forbidden();
    }

    const userInfo = strapi.admin.services.user.sanitizeUser(ctx.state.user);

    ctx.body = {
      data: userInfo,
    };
  },

  async updateMe(ctx) {
    const input = ctx.request.body;

    if (!ctx.state.user || !ctx.state.isAuthenticatedAdmin) {
      return ctx.forbidden();
    }

    try {
      await validateProfileUpdateInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const updatedUser = await strapi.admin.services.user.update({ id: ctx.state.user.id }, input);

    ctx.body = {
      data: strapi.admin.services.user.sanitizeUser(updatedUser),
    };
  },
};
