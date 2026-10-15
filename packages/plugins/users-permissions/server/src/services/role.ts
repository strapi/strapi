import _ from 'lodash';
import { errors } from '@strapi/utils';
import type { Data } from '@strapi/types';
import type { Permission, PluginContext, Role, RoleInput, User } from '../types';
import { getService } from '../utils';

const enabledActions = (permissions: RoleInput['permissions']) =>
  Object.entries(permissions ?? {}).flatMap(([typeName, type]) =>
    Object.entries(type.controllers ?? {}).flatMap(([controllerName, controller]) =>
      Object.entries(controller ?? {})
        .filter(([, action]) => action.enabled)
        .map(([actionName]) => `${typeName}.${controllerName}.${actionName}`)
    )
  );

type RoleWithPermissions = Role & { permissions: Permission[] };

/** Manage users-permissions roles and their enabled actions. */
export default ({ strapi }: PluginContext) => ({
  async createRole(params: RoleInput) {
    if (!params.type) params.type = _.snakeCase(_.deburr(_.toLower(params.name)));
    const role: Role = await strapi.db
      .query('plugin::users-permissions.role')
      .create({ data: _.omit(params, ['users', 'permissions']) });
    await Promise.all(
      enabledActions(params.permissions).map((action) =>
        strapi.db
          .query('plugin::users-permissions.permission')
          .create({ data: { action, role: role.id } })
      )
    );
  },

  async findOne(roleID: Data.ID) {
    const role: RoleWithPermissions | null = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['permissions'] });
    if (!role) throw new errors.NotFoundError('Role not found');
    const allActions = getService(strapi, 'users-permissions').getActions();
    role.permissions.forEach((permission) => {
      const [type, controller, action] = permission.action.split('.');
      _.set(allActions, `${type}.controllers.${controller}.${action}`, {
        enabled: true,
        policy: '',
      });
    });
    return { ...role, permissions: allActions };
  },

  async find() {
    const query = strapi.db.query('plugin::users-permissions.role');
    // Preserve the legacy sort parameter until ordering is changed separately.
    const params = { sort: ['name'] } as Parameters<typeof query.findMany>[0];
    const roles: Role[] = await query.findMany(params);
    for (const role of roles) {
      role.nb_users = await strapi.db
        .query('plugin::users-permissions.user')
        .count({ where: { role: { id: role.id } } });
    }
    return roles;
  },

  async updateRole(roleID: Data.ID, data: Partial<RoleInput>) {
    const role: RoleWithPermissions | null = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['permissions'] });
    if (!role) throw new errors.NotFoundError('Role not found');
    await strapi.db
      .query('plugin::users-permissions.role')
      .update({ where: { id: roleID }, data: _.pick(data, ['name', 'description']) });
    const newActions = enabledActions(data.permissions);
    const oldActions = role.permissions.map(({ action }) => action);
    const toDelete = role.permissions.filter(
      (permission) => !newActions.includes(permission.action)
    );
    const toCreate = newActions
      .filter((action) => !oldActions.includes(action))
      .map((action) => ({ action, role: role.id }));
    await Promise.all(
      toDelete.map((permission) =>
        strapi.db
          .query('plugin::users-permissions.permission')
          .delete({ where: { id: permission.id } })
      )
    );
    await Promise.all(
      toCreate.map((permissionInfo) =>
        strapi.db.query('plugin::users-permissions.permission').create({ data: permissionInfo })
      )
    );
  },

  async deleteRole(roleID: Data.ID, publicRoleID: Data.ID) {
    const role: (RoleWithPermissions & { users: User[] }) | null = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['users', 'permissions'] });
    if (!role) throw new errors.NotFoundError('Role not found');
    await Promise.all(
      role.users.map((user) =>
        strapi.db
          .query('plugin::users-permissions.user')
          .update({ where: { id: user.id }, data: { role: publicRoleID } })
      )
    );
    await Promise.all(
      role.permissions.map((permission) =>
        strapi.db
          .query('plugin::users-permissions.permission')
          .delete({ where: { id: permission.id } })
      )
    );
    await strapi.db.query('plugin::users-permissions.role').delete({ where: { id: roleID } });
  },
});
