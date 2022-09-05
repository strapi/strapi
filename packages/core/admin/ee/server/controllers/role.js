'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
const {
  validateRoleCreateInput,
  validateRoleDeleteInput,
  validateRolesDeleteInput,
} = require('../validation/role');
const { getService } = require('../../../server/utils');
const { validatedUpdatePermissionsInput } = require('../validation/permission');
const { SUPER_ADMIN_CODE } = require('../../../server/services/constants');

module.exports = {
  /**
   * Create a new role
   * @param {KoaContext} ctx - koa context
   */
  async create(ctx) {
    await validateRoleCreateInput(ctx.request.body);

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

    await validateRoleDeleteInput(id);

    const roleService = getService('role');

    const roles = await roleService.deleteByIds([id]);

    const sanitizedRole = roles.map((role) => roleService.sanitizeRole(role))[0] || null;

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

    await validateRolesDeleteInput(body);

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

    if (role.code === SUPER_ADMIN_CODE) {
      throw new ApplicationError("Super admin permissions can't be edited.");
    }

    await validatedUpdatePermissionsInput(input);

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const { permissions, shouldSendUpdate } = await roleService.assignPermissions(
      role.id,
      input.permissions
    );

    if (shouldSendUpdate) {
      await getService('metrics').sendDidUpdateRolePermissions(ctx.state?.user);
    }

    const sanitizedPermissions = permissions.map(permissionService.sanitizePermission);

    return ctx.send({
      data: sanitizedPermissions,
    });
  },
};
