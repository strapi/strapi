'use strict';

const {
  validateRoleCreateInput,
  validateRoleDeleteInput,
  validateRolesDeleteInput,
} = require('../validation/role');
const { getService } = require('../../../server/utils');

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
};
