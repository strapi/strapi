'use strict';

const { castArray, map } = require('lodash/fp');

const { getService } = require('../utils');

const getAdvancedSettings = () => {
  return strapi
    .store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    })
    .get({ key: 'advanced' });
};

const authenticate = async ctx => {
  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const { id } = await getService('jwt').getToken(ctx);

      if (id === undefined) {
        return { authenticated: false };
      }

      // fetch authenticated user
      const user = await getService('user').fetchAuthenticatedUser(id);

      if (!user) {
        return { error: 'Invalid credentials' };
      }

      const advancedSettings = await getAdvancedSettings();

      if (advancedSettings.email_confirmation && !user.confirmed) {
        return { error: 'Invalid credentials' };
      }

      if (user.blocked) {
        return { error: 'Invalid credentials' };
      }

      ctx.state.user = user;

      return {
        authenticated: true,
        credentials: user,
      };
    } catch (err) {
      return { authenticated: false };
    }
  }

  const publicPermissions = await strapi.query('plugin::users-permissions.permission').findMany({
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
  };
};

const verify = async (auth, config) => {
  const { errors } = strapi.container.get('auth');

  const { credentials: user } = auth;

  // public accesss
  if (!user) {
    // test against public role
    const publicPermissions = await strapi.query('plugin::users-permissions.permission').findMany({
      where: {
        role: { type: 'public' },
      },
    });

    const allowedActions = map('action', publicPermissions);

    // A non authenticated user cannot access routes that do not have a scope
    if (!config.scope) {
      throw new errors.UnauthorizedError();
    }

    const isAllowed = castArray(config.scope).every(scope => allowedActions.includes(scope));

    if (!isAllowed) {
      throw new errors.ForbiddenError();
    }

    return;
  }

  const permissions = await strapi.query('plugin::users-permissions.permission').findMany({
    where: { role: user.role.id },
  });

  const allowedActions = map('action', permissions);

  // An authenticated user can access non scoped routes
  if (!config.scope) {
    return;
  }

  const isAllowed = castArray(config.scope).every(scope => allowedActions.includes(scope));

  if (!isAllowed) {
    throw new errors.ForbiddenError();
  }

  // TODO: if we need to keep policies for u&p execution
  // Execute the policies.
  // if (permission.policy) {
  //   return await strapi.plugin('users-permissions').policy(permission.policy)(ctx, next);
  // }
};

module.exports = {
  name: 'users-permissions',
  authenticate,
  verify,
};
