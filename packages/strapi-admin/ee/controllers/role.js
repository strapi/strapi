'use strict';

const { validateRoleCreateInput, validateRoleUpdateInput } = require('../validation/role');

module.exports = {
  async create(ctx) {
    try {
      await validateRoleCreateInput(ctx.request.body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    let role;
    try {
      role = await strapi.admin.services.role.create(ctx.request.body);
    } catch (err) {
      if (err.message.startsWith('The name must be unique and a role with name')) {
        return ctx.badRequest('ValidationError', { name: [err.message] });
      }
      throw err;
    }

    const sanitizedRole = strapi.admin.services.role.sanitizeRole(role);
    ctx.created({ data: sanitizedRole });
  },
  async update(ctx) {
    const { id } = ctx.params;

    try {
      await validateRoleUpdateInput(ctx.request.body, id);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    let role;
    try {
      role = await strapi.admin.services.role.update({ id }, ctx.request.body);
    } catch (err) {
      if (err.message.startsWith('The name must be unique and a role with name')) {
        return ctx.badRequest('ValidationError', { name: [err.message] });
      }
      throw err;
    }
    const sanitizedRole = strapi.admin.services.role.sanitizeRole(role);

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    ctx.body = {
      data: sanitizedRole,
    };
  },
};
