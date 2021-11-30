'use strict';

const { castArray, map } = require('lodash/fp');
const { ForbiddenError, UnauthorizedError } = require('@strapi/utils').errors;

const { getService } = require('../utils');

const getAdvancedSettings = () => {
  return strapi.store({ type: 'plugin', name: 'users-permissions' }).get({ key: 'advanced' });
};

const authenticate = async ctx => {
  try {
    const token = await getService('jwt').getToken(ctx);

    if (token) {
      const { id } = token;

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
  } catch (err) {
    return { authenticated: false };
  }
};

const verify = async (auth, config) => {
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
      throw new UnauthorizedError();
    }

    const isAllowed = castArray(config.scope).every(scope => allowedActions.includes(scope));

    if (!isAllowed) {
      throw new ForbiddenError();
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
    throw new ForbiddenError();
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
