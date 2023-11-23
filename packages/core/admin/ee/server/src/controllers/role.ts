import type { Context } from 'koa';

import {
  validateRoleCreateInput,
  validateRoleDeleteInput,
  validateRolesDeleteInput,
} from '../validation/role';
import { getService } from '../utils';

export default {
  /**
   * Create a new role
   * @param {KoaContext} ctx - koa context
   */
  async create(ctx: Context) {
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
  async deleteOne(ctx: Context) {
    const { id } = ctx.params;

    await validateRoleDeleteInput(id);

    const roleService = getService('role');

    const roles = await roleService.deleteByIds([id]);

    const sanitizedRole = roles.map((role: unknown) => roleService.sanitizeRole(role))[0] || null;

    return ctx.deleted({
      data: sanitizedRole,
    });
  },

  /**
   * delete several roles
   * @param {KoaContext} ctx - koa context
   */
  async deleteMany(ctx: Context) {
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
