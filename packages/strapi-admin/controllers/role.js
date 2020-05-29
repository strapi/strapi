'use strict';

const { validateRoleUpdateInput } = require('../validation/role');

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;
    const role = await strapi.admin.services.role.findOne({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const usersCounts = await strapi.admin.services.user.countUsersForRoles([id]);
    role.usersCount = usersCounts[0];

    ctx.body = {
      data: role,
    };
  },
  async findAll(ctx) {
    const roles = await strapi.admin.services.role.findAll();
    const rolesIds = roles.map(r => r.id);
    const usersCounts = await strapi.admin.services.user.countUsersForRoles(rolesIds);
    roles.forEach((role, index) => (role.usersCount = usersCounts[index]));

    ctx.body = {
      data: roles,
    };
  },
  async update(ctx) {
    const { id } = ctx.params;

    try {
      await validateRoleUpdateInput(ctx.request.body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const role = await strapi.admin.services.role.update({ id }, ctx.request.body);

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const sanitizedRole = strapi.admin.services.role.sanitizeRole(role);

    ctx.body = {
      data: sanitizedRole,
    };
  },
};
