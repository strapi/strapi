'use strict';

const _ = require('lodash');

module.exports = ({ strapi }) => ({
  async createRole(params) {
    if (!params.type) {
      params.type = _.snakeCase(_.deburr(_.toLower(params.name)));
    }

    const role = await strapi
      .query('plugin::users-permissions.role')
      .create({ data: _.omit(params, ['users', 'permissions']) });

    const arrayOfPromises = Object.keys(params.permissions || {}).reduce((acc, type) => {
      Object.keys(params.permissions[type].controllers).forEach(controller => {
        Object.keys(params.permissions[type].controllers[controller]).forEach(action => {
          acc.push(
            strapi.query('plugin::users-permissions.permission').create({
              data: {
                role: role.id,
                type,
                controller,
                action: action.toLowerCase(),
                ...params.permissions[type].controllers[controller][action],
              },
            })
          );
        });
      });

      return acc;
    }, []);

    // Use Content Manager business logic to handle relation.
    if (params.users && params.users.length > 0)
      arrayOfPromises.push(
        strapi.query('plugin::users-permissions.role').update({
          where: {
            id: role.id,
          },
          data: { users: params.users },
        })
      );

    return await Promise.all(arrayOfPromises);
  },

  async getRole(roleID, plugins) {
    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['permissions'] });

    if (!role) {
      throw new Error('Cannot find this role');
    }

    // Group by `type`.
    const permissions = role.permissions.reduce((acc, permission) => {
      const [type, controller, action] = permission.action.split('.');

      _.set(acc, `${type}.controllers.${controller}.${action}`, {
        enabled: true,
        policy: '',
      });

      if (permission.action.startsWith('plugin')) {
        const [, pluginName] = type.split('::');

        acc[type].information = plugins.find(plugin => plugin.id === pluginName) || {};
      }

      return acc;
    }, {});

    return {
      ...role,
      permissions,
    };
  },

  async getRoles() {
    const roles = await strapi.query('plugin::users-permissions.role').findMany({ sort: ['name'] });

    for (const role of roles) {
      roles.nb_users = await strapi
        .query('plugin::users-permissions.user')
        .count({ where: { role: { id: role.id } } });
    }

    return roles;
  },

  async updateRole(roleID, body) {
    const [role, authenticated] = await Promise.all([
      this.getRole(roleID, []),
      strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } }),
    ]);

    await strapi.query('plugin::users-permissions.role').update({
      where: { id: roleID },
      data: _.pick(body, ['name', 'description']),
    });

    await Promise.all(
      Object.keys(body.permissions || {}).reduce((acc, type) => {
        Object.keys(body.permissions[type].controllers).forEach(controller => {
          Object.keys(body.permissions[type].controllers[controller]).forEach(action => {
            const bodyAction = body.permissions[type].controllers[controller][action];
            const currentAction = _.get(
              role.permissions,
              `${type}.controllers.${controller}.${action}`,
              {}
            );

            if (!_.isEqual(bodyAction, currentAction)) {
              acc.push(
                strapi.query('plugin::users-permissions.permission').update({
                  where: {
                    role: roleID,
                    type,
                    controller,
                    action: action.toLowerCase(),
                  },
                  data: bodyAction,
                })
              );
            }
          });
        });

        return acc;
      }, [])
    );

    // Add user to this role.
    const newUsers = _.differenceBy(body.users, role.users, 'id');
    await Promise.all(newUsers.map(user => this.updateUserRole(user, roleID)));

    const oldUsers = _.differenceBy(role.users, body.users, 'id');
    await Promise.all(oldUsers.map(user => this.updateUserRole(user, authenticated.id)));
  },

  async deleteRole(roleID, publicRoleID) {
    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { id: roleID }, populate: ['users', 'permissions'] });

    if (!role) {
      throw new Error('Cannot find this role');
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
