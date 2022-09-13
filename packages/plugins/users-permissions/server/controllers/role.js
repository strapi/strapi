'use strict';

const _ = require('lodash');
const { ApplicationError, ValidationError } = require('@strapi/utils').errors;
const { getService } = require('../utils');
const { validateDeleteRoleBody } = require('./validation/user');

module.exports = {
  /**
   * Default action.
   *
   * @return {Object}
   */
  async createRole(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await getService('role').createRole(ctx.request.body);

    ctx.send({ ok: true });
  },

  async findOne(ctx) {
    const { id } = ctx.params;

    const role = await getService('role').findOne(id);

    if (!role) {
      return ctx.notFound();
    }

    ctx.send({ role });
  },

  async find(ctx) {
    const roles = await getService('role').find();

    ctx.send({ roles });
  },

  async updateRole(ctx) {
    const roleID = ctx.params.role;

    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await getService('role').updateRole(roleID, ctx.request.body);

    ctx.send({ ok: true });
  },

  async deleteRole(ctx) {
    const roleID = ctx.params.role;

    if (!roleID) {
      await validateDeleteRoleBody(ctx.params);
    }

    // Fetch public role.
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    const publicRoleID = publicRole.id;

    // Prevent from removing the public role.
    if (roleID.toString() === publicRoleID.toString()) {
      throw new ApplicationError('Cannot delete public role');
    }

    await getService('role').deleteRole(roleID, publicRoleID);

    ctx.send({ ok: true });
  },
};
