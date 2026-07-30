'use strict';

const _ = require('lodash');
const { getService } = require('../utils');

const API_TOKEN_STRATEGY = 'content-api-token';
const API_TOKEN_TYPE = {
  FULL_ACCESS: 'full-access',
  CUSTOM: 'custom',
};

/**
 * API tokens are a content API credential of their own: they carry their own action list and
 * are not backed by a users-permissions role.
 */
const getApiTokenPermissions = (apiToken) => {
  const usersPermissionsService = getService('users-permissions');

  if (apiToken?.type === API_TOKEN_TYPE.FULL_ACCESS) {
    return usersPermissionsService.getActions({ defaultEnable: true });
  }

  if (apiToken?.type === API_TOKEN_TYPE.CUSTOM) {
    return usersPermissionsService.getActionsForPermissions(
      (apiToken.permissions ?? []).map((action) => ({ action }))
    );
  }

  // Read-only tokens cannot reach this route, as its scope is not a read scope
  return usersPermissionsService.getActions();
};

const getRolePermissions = async (ctx) => {
  const permissionService = getService('permission');
  const roleId = ctx.state.user?.role?.id;

  // Without a user, the request was authorized through the public role, which is also how the
  // authentication strategy built the ability for it.
  const permissions = roleId
    ? await permissionService.findRolePermissions(roleId)
    : await permissionService.findPublicPermissions();

  return getService('users-permissions').getActionsForPermissions(permissions);
};

module.exports = {
  async getPermissions(ctx) {
    // The admin router serves the full action catalogue (all disabled), used to build the
    // role matrix. On the content API, callers get their own effective permissions.
    if (ctx.state.route?.info?.type !== 'content-api') {
      ctx.send({ permissions: getService('users-permissions').getActions() });

      return;
    }

    const permissions =
      ctx.state.auth?.strategy?.name === API_TOKEN_STRATEGY
        ? getApiTokenPermissions(ctx.state.auth.credentials)
        : await getRolePermissions(ctx);

    ctx.send({ permissions });
  },

  async getPolicies(ctx) {
    const policies = _.keys(strapi.plugin('users-permissions').policies);

    ctx.send({
      policies: _.without(policies, 'permissions'),
    });
  },

  async getRoutes(ctx) {
    const routes = await getService('users-permissions').getRoutes();

    ctx.send({ routes });
  },
};
