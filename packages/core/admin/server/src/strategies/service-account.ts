import type { Context } from 'koa';
import { isNil } from 'lodash/fp';
import { differenceInHours, parseISO } from 'date-fns';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { mapAdminPermissionsToContentAPI } from '../services/service-account/permission-mapper';

const { UnauthorizedError } = errors;

const extractToken = (ctx: Context) => {
  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    const parts = ctx.request.header.authorization.split(/\s+/);

    if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
      return null;
    }

    return parts[1];
  }

  return null;
};

/**
 * Authenticate the validity of the service account token
 */
export const authenticate = async (ctx: Context) => {
  const serviceAccountTokenService = getService('service-account-token');
  const token = extractToken(ctx);

  if (!token) {
    return { authenticated: false };
  }

  const serviceAccountToken = await serviceAccountTokenService.getBy({
    accessKey: serviceAccountTokenService.hash(token),
  });

  // token not found
  if (!serviceAccountToken) {
    return { authenticated: false };
  }

  const currentDate = new Date();

  if (!isNil(serviceAccountToken.expiresAt)) {
    const expirationDate = new Date(serviceAccountToken.expiresAt);
    // token has expired
    if (expirationDate < currentDate) {
      return { authenticated: false, error: new UnauthorizedError('Token expired') };
    }
  }

  // Update lastUsedAt if the token has not been used in the last hour
  if (!isNil(serviceAccountToken.lastUsedAt)) {
    const hoursSinceLastUsed = differenceInHours(
      currentDate,
      parseISO(serviceAccountToken.lastUsedAt)
    );
    if (hoursSinceLastUsed >= 1) {
      await strapi.db.query('admin::service-account-token').update({
        where: { id: serviceAccountToken.id },
        data: { lastUsedAt: currentDate },
      });
    }
  } else {
    // If lastUsedAt is not set, initialize it to the current date
    await strapi.db.query('admin::service-account-token').update({
      where: { id: serviceAccountToken.id },
      data: { lastUsedAt: currentDate },
    });
  }

  // Load roles - ensure they're populated
  const roleIds = Array.isArray(serviceAccountToken.roles)
    ? serviceAccountToken.roles.map((r) => (typeof r === 'object' ? r.id : r))
    : [];

  if (roleIds.length === 0) {
    return { authenticated: false, error: new UnauthorizedError('No roles found') };
  }

  // Determine route type from context
  const routeType = ctx.state.route?.info?.type;

  // Get permissions for all roles
  const adminPermissions = await getService('permission').findMany({
    where: { role: { id: { $in: roleIds } } },
  });

  // For admin routes, use admin permission engine
  if (routeType === 'admin') {
    const adminAbility = await getService('permission').engine.generateAbility(adminPermissions);

    // Set userAbility for policies to work correctly
    ctx.state.userAbility = adminAbility;

    return {
      authenticated: true,
      credentials: serviceAccountToken,
      ability: adminAbility,
    };
  }

  // For content-api routes, map admin permissions to content API permissions
  if (routeType === 'content-api') {
    const contentAPIPermissions = mapAdminPermissionsToContentAPI(adminPermissions);

    if (contentAPIPermissions.length === 0) {
      // No content API permissions mapped, return authenticated but with no ability
      // This will fail permission checks but allows the request to proceed
      return {
        authenticated: true,
        credentials: serviceAccountToken,
        ability: null,
      };
    }

    const contentAPIAbility =
      await strapi.contentAPI.permissions.engine.generateAbility(contentAPIPermissions);

    return {
      authenticated: true,
      credentials: serviceAccountToken,
      ability: contentAPIAbility,
    };
  }

  // Unknown route type, authenticate but without ability
  return {
    authenticated: true,
    credentials: serviceAccountToken,
    ability: null,
  };
};

export const name = 'service-account';

export default {
  name: 'service-account',
  authenticate,
};
