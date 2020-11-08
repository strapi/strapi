'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const {
  validateRoleCreateInput,
  validateRoleDeleteInput,
  validateRolesDeleteInput,
} = require('../validation/role');
const { validatedUpdatePermissionsInput } = require('../validation/permission');
const { SUPER_ADMIN_CODE } = require('../../services/constants');

module.exports = {
  /**
   * Create a new role
   * @param {KoaContext} ctx - koa context
   */
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

  /**
   * Delete a role
   * @param {KoaContext} ctx - koa context
   */
  async deleteOne(ctx) {
    const { id } = ctx.params;

    try {
      await validateRoleDeleteInput(id);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const roles = await strapi.admin.services.role.deleteByIds([id]);

    const sanitizedRole = roles.map(strapi.admin.services.role.sanitizeRole)[0] || null;

    return ctx.deleted({
      data: sanitizedRole,
    });
  },

  /**
   * delete several roles
   * @param {KoaContext} ctx - koa context
   */
  async deleteMany(ctx) {
    const { body } = ctx.request;
    try {
      await validateRolesDeleteInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const roles = await strapi.admin.services.role.deleteByIds(body.ids);
    const sanitizedRoles = roles.map(strapi.admin.services.role.sanitizeRole);

    return ctx.deleted({
      data: sanitizedRoles,
    });
  },

  /**
   * Updates the permissions assigned to a role
   * @param {KoaContext} ctx - koa context
   */
  async updatePermissions(ctx) {
    const { id } = ctx.params;
    const input = ctx.request.body;

    const role = await strapi.admin.services.role.findOne({ id });
    if (!role) {
      return ctx.notFound('role.notFound');
    }

    try {
      if (role.code === SUPER_ADMIN_CODE) {
        const err = new yup.ValidationError("Super admin permissions can't be edited.");
        throw formatYupErrors(err);
      }
      await validatedUpdatePermissionsInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const permissions = await strapi.admin.services.role.assignPermissions(
      role.id,
      input.permissions
    );

    ctx.body = {
      data: permissions,
    };
  },
};
