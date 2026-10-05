import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import lodash from 'lodash';
import { errors } from '@strapi/utils';
import type { AdvancedSettings } from '../types';

import { getService } from '../utils';

const { map, every } = lodash;

const { ForbiddenError, UnauthorizedError } = errors;

/** Authenticate Content API requests against services on the supplied Strapi instance. */
const createStrategy = ({ strapi }: { strapi: Core.Strapi }) => {
  const getAdvancedSettings = async () => {
    return (await strapi
      .store({ type: 'plugin', name: 'users-permissions' })
      .get({ key: 'advanced' })) as AdvancedSettings;
  };

  const authenticate = async (ctx: Context) => {
    try {
      const token = await getService(strapi, 'jwt').getToken(ctx);

      if (token) {
        const { id, sessionId } = token;

        // Invalid token
        if (id === undefined) {
          return { authenticated: false };
        }

        const user = await getService(strapi, 'user').fetchAuthenticatedUser(id);

        // No user associated to the token
        if (!user) {
          return { error: 'Invalid credentials' };
        }

        const advancedSettings = await getAdvancedSettings();

        // User not confirmed
        if (advancedSettings.email_confirmation && !user.confirmed) {
          return { error: 'Invalid credentials' };
        }

        // User blocked
        if (user.blocked) {
          return { error: 'Invalid credentials' };
        }

        // Fetch user's permissions
        const permissions = await Promise.resolve(user.role!.id)
          .then((roleId) => getService(strapi, 'permission').findRolePermissions(roleId))
          .then((permissions) =>
            map(permissions, (permission) =>
              getService(strapi, 'permission').toContentAPIPermission(permission)
            )
          );

        // Generate an ability (content API engine) based on the given permissions
        const ability = await strapi.contentAPI.permissions.engine.generateAbility(permissions);

        ctx.state.user = user;
        // Expose the session backing this request (refresh mode only) so endpoints
        // can flag the "current" session when listing active sessions.
        if (sessionId) {
          ctx.state.session = { id: sessionId };
        }

        return {
          authenticated: true,
          credentials: user,
          ability,
        };
      }

      const publicPermissions = await getService(strapi, 'permission')
        .findPublicPermissions()
        .then((permissions) =>
          map(permissions, (permission) =>
            getService(strapi, 'permission').toContentAPIPermission(permission)
          )
        );

      if (publicPermissions.length === 0) {
        return { authenticated: false };
      }

      const ability = await strapi.contentAPI.permissions.engine.generateAbility(publicPermissions);

      return {
        authenticated: true,
        credentials: null,
        ability,
      };
    } catch {
      return { authenticated: false };
    }
  };

  const verify = async (
    auth: { credentials?: unknown; ability?: { can: (action: string) => boolean } },
    config: { scope?: string | string[] }
  ) => {
    const { credentials: user, ability } = auth;

    if (!config.scope) {
      if (!user) {
        // A non authenticated user cannot access routes that do not have a scope
        throw new UnauthorizedError();
      } else {
        // An authenticated user can access non scoped routes
        return;
      }
    }

    // If no ability have been generated, then consider auth is missing
    if (!ability) {
      throw new UnauthorizedError();
    }

    const scopes = Array.isArray(config.scope) ? config.scope : [config.scope];
    const isAllowed = every(scopes, (scope) => ability.can(scope));

    if (!isAllowed) {
      throw new ForbiddenError();
    }
  };

  return {
    name: 'users-permissions',
    authenticate,
    verify,
  };
};

export default createStrategy;
