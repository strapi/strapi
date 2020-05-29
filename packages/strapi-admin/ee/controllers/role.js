'use strict';

const {
  validateRoleCreateInput,
  validateRoleUpdateInput,
  validateRoleDeleteInput,
} = require('../validation/role');

module.exports = {
  async create(ctx) {
    try {
      await validateRoleCreateInput(ctx.request.body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    let role = await strapi.admin.services.role.create(ctx.request.body);

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

    let role = await strapi.admin.services.role.update({ id }, ctx.request.body);
    if (!role) {
      return ctx.notFound('Role not found');
    }

    const sanitizedRole = strapi.admin.services.role.sanitizeRole(role);

    ctx.body = {
      data: sanitizedRole,
    };
  },
  async deleteOne(ctx) {
    const { id } = ctx.params;

    const roles = await strapi.admin.services.role.deleteByIds([id]);

    const sanitizedRole = roles.map(strapi.admin.services.role.sanitizeRole)[0] || null;

    ctx.body = {
      data: sanitizedRole,
    };
  },
  async deleteMany(ctx) {
    const { body } = ctx.request;
    try {
      await validateRoleDeleteInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const roles = await strapi.admin.services.role.deleteByIds(body.ids);
    const sanitizedRoles = roles.map(strapi.admin.services.role.sanitizeRole);

    ctx.body = {
      data: sanitizedRoles,
    };
  },
};
