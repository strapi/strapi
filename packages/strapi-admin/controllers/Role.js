'use strict';

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;
    const role = await strapi.admin.services.role.fetch({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    ctx.body = {
      data: role,
    };
  },
};
