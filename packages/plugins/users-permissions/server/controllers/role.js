'use strict';

const _ = require('lodash');
const { getService } = require('../utils');

module.exports = {
  /**
   * Default action.
   *
   * @return {Object}
   */
  async createRole(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest('Request body cannot be empty');
    }

    await getService('role').createRole(ctx.request.body);

    ctx.send({ ok: true });
  },

  async getRole(ctx) {
    const { id } = ctx.params;

    const role = await getService('role').getRole(id);

    if (!role) {
      return ctx.notFound();
    }

    ctx.send({ role });
  },

  async getRoles(ctx) {
    const roles = await getService('role').getRoles();

    ctx.send({ roles });
  },

  async updateRole(ctx) {
    const roleID = ctx.params.role;

    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest('Request body cannot be empty');
    }

    await getService('role').updateRole(roleID, ctx.request.body);

    ctx.send({ ok: true });
  },

  async deleteRole(ctx) {
    const roleID = ctx.params.role;

    if (!roleID) {
      return ctx.badRequest();
    }

    // Fetch public role.
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    const publicRoleID = publicRole.id;

    // Prevent from removing the public role.
    if (roleID.toString() === publicRoleID.toString()) {
      return ctx.badRequest('Cannot delete public role');
    }

    await getService('role').deleteRole(roleID, publicRoleID);

    ctx.send({ ok: true });
  },
};
