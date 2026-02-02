import type { Context } from 'koa';
import { errors } from '@strapi/utils';
import {
  validateRoleUpdateInput,
  validateRoleCreateInput,
  validateRoleDeleteInput,
  validateRolesDeleteInput,
} from '../validation/role';
import { validatedUpdatePermissionsInput } from '../validation/permission';
import constants from '../services/constants';
import { getService } from '../utils';
import type {
  Create,
  FindRoles,
  FindRole,
  Update,
  GetPermissions,
  UpdatePermissions,
  Delete,
  BatchDelete,
} from '../../../shared/contracts/roles';
import { AdminRole } from '../../../shared/contracts/shared';

const { ApplicationError } = errors;
const { SUPER_ADMIN_CODE } = constants;

export default {
  /**
   * Create a new role
   * @param {KoaContext} ctx - koa context
   */
  async create(ctx: Context) {
    const { body } = ctx.request as Create.Request;
    await validateRoleCreateInput(body);

    const roleService = getService('role');

    const role = await roleService.create(body);
    const sanitizedRole = roleService.sanitizeRole(role) as Omit<AdminRole, 'users' | 'permission'>;

    ctx.created({ data: sanitizedRole } satisfies Create.Response);
  },

  /**
   * Returns on role by id
   * @param {KoaContext} ctx - koa context
   */
  async findOne(ctx: Context) {
    const { id } = ctx.params as FindRole.Request['params'];
    const role = await getService('role').findOneWithUsersCount({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    ctx.body = {
      data: role,
    } satisfies FindRole.Response;
  },

  /**
   * Returns every roles
   * @param {KoaContext} ctx - koa context
   */
  async findAll(ctx: Context) {
    const { query } = ctx.request as FindRoles.Request;

    const permissionsManager = getService('permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: 'admin::role',
    });

    await permissionsManager.validateQuery(query);
    const sanitizedQuery = await permissionsManager.sanitizeQuery(query);

    const roles = await getService('role').findAllWithUsersCount(sanitizedQuery);

    ctx.body = {
      data: roles,
    } satisfies FindRoles.Response;
  },

  /**
   * Updates a role by id
   * @param {KoaContext} ctx - koa context
   */
  async update(ctx: Context) {
    const { id } = ctx.params as Update.Request['params'];
    const { body } = ctx.request as Omit<Update.Request, 'params'>;

    const roleService = getService('role');

    await validateRoleUpdateInput(body);

    const role = await roleService.findOne({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    if (role.code === SUPER_ADMIN_CODE) {
      throw new ApplicationError("Super admin can't be edited.");
    }

    const updatedRole = await roleService.update({ id }, body);
    const sanitizedRole = roleService.sanitizeRole(updatedRole) as Omit<
      AdminRole,
      'users' | 'permission'
    >;

    ctx.body = {
      data: sanitizedRole,
    } satisfies Update.Response;
  },

  /**
   * Returns the permissions assigned to a role
   * @param {KoaContext} ctx - koa context
   */
  async getPermissions(ctx: Context) {
    const { id } = ctx.params as GetPermissions.Request['params'];

    const roleService = getService('role');
    const permissionService = getService('permission');

    const role = await roleService.findOne({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const permissions = await permissionService.findMany({ where: { role: { id: role.id } } });

    const sanitizedPermissions = permissions.map(permissionService.sanitizePermission);

    ctx.body = {
      // @ts-expect-error - transform response type to sanitized permission
      data: sanitizedPermissions,
    } satisfies GetPermissions.Response;
  },

  /**
   * Updates the permissions assigned to a role
   * @param {KoaContext} ctx - koa context
   */
  async updatePermissions(ctx: Context) {
    const { id } = ctx.params as UpdatePermissions.Request['params'];
    const { body: input } = ctx.request as Omit<UpdatePermissions.Request, 'params'>;

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

    const permissions = await roleService.assignPermissions(role.id, input.permissions);

    const sanitizedPermissions = permissions.map(permissionService.sanitizePermission);

    ctx.body = {
      data: sanitizedPermissions,
    } satisfies UpdatePermissions.Response;
  },

  /**
   * Delete a role
   * @param {KoaContext} ctx - koa context
   */
  async deleteOne(ctx: Context) {
    const { id } = ctx.params as Delete.Request['params'];

    await validateRoleDeleteInput(id);

    const roleService = getService('role');

    const roles = await roleService.deleteByIds([id]);

    const sanitizedRole = roles.map((role) => roleService.sanitizeRole(role))[0] || null;

    return ctx.deleted({
      data: sanitizedRole,
    } satisfies Delete.Response);
  },

  /**
   * delete several roles
   * @param {KoaContext} ctx - koa context
   */
  async deleteMany(ctx: Context) {
    const { body } = ctx.request as BatchDelete.Request;

    await validateRolesDeleteInput(body);

    const roleService = getService('role');

    const roles = await roleService.deleteByIds(body.ids);
    const sanitizedRoles = roles.map(roleService.sanitizeRole);

    return ctx.deleted({
      data: sanitizedRoles,
    } satisfies BatchDelete.Response);
  },
};
