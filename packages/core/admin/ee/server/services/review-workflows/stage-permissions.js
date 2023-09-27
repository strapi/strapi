'use strict';

const { prop } = require('lodash/fp');
const {
  mapAsync,
  errors: { ApplicationError },
} = require('@strapi/utils');
const { getService } = require('../../utils');
const { STAGE_TRANSITION_UID } = require('../../constants/workflows');

const validActions = [STAGE_TRANSITION_UID];

module.exports = ({ strapi }) => {
  const roleService = getService('role');
  const permissionService = getService('permission');

  return {
    async register({ roleId, action, fromStage }) {
      if (!validActions.includes(action)) {
        throw new ApplicationError(`Invalid action ${action}`);
      }
      const permissions = await roleService.addPermissions(roleId, [
        {
          action,
          actionParameters: {
            from: fromStage,
          },
        },
      ]);

      // TODO: Filter response
      return permissions;
    },
    async registerMany(permissions) {
      return mapAsync(permissions, this.register);
    },
    async unregister(permissions) {
      const permissionIds = permissions.map(prop('id'));
      await permissionService.deleteByIds(permissionIds);
    },
    can(action, fromStage) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      // Override permissions for super admin
      const userRoles = requestState.user?.roles;
      if (userRoles?.some((role) => role.code === 'strapi-super-admin')) {
        return true;
      }

      return requestState.userAbility.can({
        name: action,
        params: { from: fromStage },
      });
    },
  };
};
