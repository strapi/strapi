'use strict';

const _ = require('lodash');
const { getService } = require('../utils');

module.exports = {
  async getPermissions(ctx) {
    // The admin router serves the full action catalogue (all disabled), used to build the
    // role matrix. On the content API, callers get their own effective permissions.
    if (ctx.state.route?.info?.type !== 'content-api') {
      ctx.send({ permissions: getService('users-permissions').getActions() });

      return;
    }

    const permissionService = getService('permission');
    const roleId = ctx.state.user?.role?.id;

    // A request without a user reached this route through the public role, which is also how
    // the authentication strategy built the ability for it.
    const permissions = roleId
      ? await permissionService.findRolePermissions(roleId)
      : await permissionService.findPublicPermissions();

    ctx.send({
      permissions: getService('users-permissions').getActionsForPermissions(permissions),
    });
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
