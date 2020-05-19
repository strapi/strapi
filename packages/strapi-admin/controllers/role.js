'use strict';

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;
    const role = await strapi.admin.services.role.findOne({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    ctx.body = {
      data: role,
    };
  },
  async findAll(ctx) {
    const roles = await strapi.admin.services.role.findAll();
    ctx.body = {
      data: roles,
    };
  },
};
