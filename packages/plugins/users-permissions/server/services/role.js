'use strict';

const _ = require('lodash');
const { NotFoundError } = require('@strapi/utils').errors;
const { getService } = require('../utils');

module.exports = ({ strapi }) => ({
  async createRole(params) {
    if (!params.type) {
      params.type = _.snakeCase(_.deburr(_.toLower(params.name)));
    }

    const role = await strapi
      .query('plugin::users-permissions.role')
      .create({ data: _.omit(params, ['users', 'permissions']) });

    const createPromises = _.flatMap(params.permissions, (type, typeName) => {
      return _.flatMap(type.controllers, (controller, controllerName) => {
        return _.reduce(
          controller,
          (acc, action, actionName) => {
            const { enabled /* policy */ } = action;

            if (enabled) {
              const actionID = `${typeName}.${controllerName}.${actionName}`;

              acc.push(
                strapi
                  .query('plugin::users-permissions.permission')
                  .create({ data: { action: actionID, role: role.id } })
              );
            }

            return acc;
          },
          []
        );
      });
    });

    await Promise.all(createPromises);
  },

  async getRole(roleID) {
    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['permissions'] });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const allActions = getService('users-permissions').getActions();

    // Group by `type`.
    role.permissions.forEach(permission => {
      const [type, controller, action] = permission.action.split('.');

      _.set(allActions, `${type}.controllers.${controller}.${action}`, {
        enabled: true,
        policy: '',
      });
    });

    return {
      ...role,
      permissions: allActions,
    };
  },

  async getRoles() {
    const roles = await strapi.query('plugin::users-permissions.role').findMany({ sort: ['name'] });

    for (const role of roles) {
      role.nb_users = await strapi
        .query('plugin::users-permissions.user')
        .count({ where: { role: { id: role.id } } });
    }

    return roles;
  },

  async updateRole(roleID, data) {
    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['permissions'] });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    await strapi.query('plugin::users-permissions.role').update({
      where: { id: roleID },
      data: _.pick(data, ['name', 'description']),
    });

    const { permissions } = data;

    const newActions = _.flatMap(permissions, (type, typeName) => {
      return _.flatMap(type.controllers, (controller, controllerName) => {
        return _.reduce(
          controller,
          (acc, action, actionName) => {
            const { enabled /* policy */ } = action;

            if (enabled) {
              acc.push(`${typeName}.${controllerName}.${actionName}`);
            }

            return acc;
          },
          []
        );
      });
    });

    const oldActions = role.permissions.map(({ action }) => action);

    const toDelete = role.permissions.reduce((acc, permission) => {
      if (!newActions.includes(permission.action)) {
        acc.push(permission);
      }
      return acc;
    }, []);

    const toCreate = newActions
      .filter(action => !oldActions.includes(action))
      .map(action => ({ action, role: role.id }));

    await Promise.all(
      toDelete.map(permission =>
        strapi
          .query('plugin::users-permissions.permission')
          .delete({ where: { id: permission.id } })
      )
    );

    await Promise.all(
      toCreate.map(permissionInfo =>
        strapi.query('plugin::users-permissions.permission').create({ data: permissionInfo })
      )
    );
  },

  async deleteRole(roleID, publicRoleID) {
    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['users', 'permissions'] });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Move users to guest role.
    await Promise.all(
      role.users.map(user => {
        return strapi.query('plugin::users-permissions.user').update({
          where: { id: user.id },
          data: { role: publicRoleID },
        });
      })
    );

    // Remove permissions related to this role.
    // TODO: use delete many
    await Promise.all(
      role.permissions.map(permission => {
        return strapi.query('plugin::users-permissions.permission').delete({
          where: { id: permission.id },
        });
      })
    );

    // Delete the role.
    await strapi.query('plugin::users-permissions.role').delete({ where: { id: roleID } });
  },
});
