'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const {
  validateRoleCreateInput,
  validateRoleDeleteInput,
  validateRolesDeleteInput,
} = require('../validation/role');
const { getService } = require('../../utils');
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

    const roleService = getService('role');

    const role = await roleService.create(ctx.request.body);
    const sanitizedRole = roleService.sanitizeRole(role);

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

    const roleService = getService('role');

    const roles = await roleService.deleteByIds([id]);
    const sanitizedRole = roles.map(roleService.sanitizeRole)[0] || null;

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

    const roleService = getService('role');

    const roles = await roleService.deleteByIds(body.ids);
    const sanitizedRoles = roles.map(roleService.sanitizeRole);

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
    const { body: input } = ctx.request;

    const roleService = getService('role');
    const permissionService = getService('permission');

    const role = await roleService.findOne({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    try {
      if (role.code === SUPER_ADMIN_CODE) {
        throw formatYupErrors(new yup.ValidationError("Super admin permissions can't be edited."));
      }

      await validatedUpdatePermissionsInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const permissions = await roleService.assignPermissions(role.id, input.permissions);
    const sanitizedPermissions = permissions.map(permissionService.sanitizePermission);

    ctx.body = {
      data: sanitizedPermissions,
    };
  },
};
