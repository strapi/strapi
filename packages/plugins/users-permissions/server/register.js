'use strict';

const { map } = require('lodash/fp');

const { getService } = require('./utils');

const getAdvancedSettings = () => {
  return strapi
    .store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    })
    .get({ key: 'advanced' });
};

const permissionToScope = permission => {
  // missing apiName type
  return `${permission.type}.${permission.controller}.${permission.action}`;
};

module.exports = strapi => {
  strapi.container.get('content-api').auth.register({
    name: 'users-permissions',
    async authenticate(ctx) {
      if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
        try {
          const { id } = await getService('jwt').getToken(ctx);

          if (id === undefined) {
            throw new Error('Invalid token: Token did not contain required fields');
          }

          // fetch authenticated user
          const user = await getService('user').fetchAuthenticatedUser(id);

          if (user) {
            const permissions = await strapi
              .query('plugin::users-permissions.permission')
              .findMany({
                where: {
                  role: user.role.id,
                },
              });

            return {
              authenticated: true,
              credentials: user,
              scope: map(permissionToScope, permissions),
            };
          }
        } catch (err) {
          return { authenticated: false };
        }

        if (!ctx.state.user) {
          return { authenticated: false };
        }

        const advancedSettings = await getAdvancedSettings();

        if (advancedSettings.email_confirmation && !ctx.state.user.confirmed) {
          return { authenticated: false };
        }

        if (ctx.state.user.blocked) {
          return { authenticated: false };
        }
      }

      const publicPermissions = await strapi
        .query('plugin::users-permissions.permission')
        .findMany({
          where: {
            role: { type: 'public' },
          },
        });

      if (publicPermissions.length === 0) {
        return { authenticated: false };
      }

      return {
        authenticated: true,
        credentials: null,
        scope: map(permissionToScope, publicPermissions),
      };
    },
  });
};
