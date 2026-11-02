import type { Core, Data } from '@strapi/types';
import { async, errors } from '@strapi/utils';
import { getAdminService } from '../utils';
import { STAGE_TRANSITION_UID, STAGE_MODEL_UID } from '../constants/workflows';

const { ApplicationError } = errors;
const validActions = new Set([STAGE_TRANSITION_UID]);

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const roleService = getAdminService('role');
  const permissionService = getAdminService('permission');

  const getUserRoles = () => {
    const requestState = strapi.requestContext.get()?.state;
    if (!requestState) {
      return null;
    }

    return (requestState.user?.roles as { id: Data.ID; code: string }[] | undefined) ?? null;
  };

  return {
    async register({
      roleId,
      action,
      fromStage,
    }: {
      roleId: Data.ID;
      action: string;
      fromStage: Data.ID;
    }) {
      if (!validActions.has(action)) {
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
    async registerMany(permissions: { roleId: Data.ID; action: string; fromStage: Data.ID }[]) {
      return async.map(permissions, this.register);
    },
    async registerTo({
      roleId,
      action,
      toStage,
    }: {
      roleId: Data.ID;
      action: string;
      toStage: Data.ID;
    }) {
      if (!validActions.has(action)) {
        throw new ApplicationError(`Invalid action ${action}`);
      }
      const permissions = await roleService.addPermissions(roleId, [
        {
          action,
          actionParameters: {
            to: toStage,
          },
        },
      ]);

      return permissions;
    },
    async registerManyTo(permissions: { roleId: Data.ID; action: string; toStage: Data.ID }[]) {
      return async.map(permissions, this.registerTo);
    },
    async unregister(permissions: { id: Data.ID }[]) {
      const permissionIds = permissions.map((permission) => permission?.id);
      await permissionService.deleteByIds(permissionIds);
    },
    can(action: string, fromStage: Data.ID) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      const userRoles = getUserRoles();
      if (!userRoles) {
        return false;
      }

      if (userRoles.some((role) => role.code === 'strapi-super-admin')) {
        return true;
      }

      return requestState.userAbility.can({
        name: action,
        params: { from: fromStage },
      });
    },
    async canTransitionToStage(toStageId: Data.ID) {
      const userRoles = getUserRoles();
      if (!userRoles) {
        return false;
      }

      if (userRoles.some((role) => role.code === 'strapi-super-admin')) {
        return true;
      }

      const targetStage = await strapi.db.query(STAGE_MODEL_UID).findOne({
        where: { id: toStageId },
        populate: { permissions: { populate: ['role'] } },
      });

      if (!targetStage) {
        return false;
      }

      return this.canTransitionToStageWithPermissions(targetStage);
    },
    /**
     * Check if the current user can transition to a stage using pre-loaded permissions.
     * The stage must already have its permissions populated with roles.
     */
    canTransitionToStageWithPermissions(stage: {
      permissions?: { actionParameters?: { to?: Data.ID }; role?: { id: Data.ID } | Data.ID }[];
    }) {
      const userRoles = getUserRoles();
      if (!userRoles) {
        return false;
      }

      if (userRoles.some((role) => role.code === 'strapi-super-admin')) {
        return true;
      }

      const toPermissions = (stage.permissions || []).filter(
        (p: { actionParameters?: { to?: Data.ID } }) => p.actionParameters?.to
      );

      const userRoleIds = new Set(userRoles.map((role) => role.id));

      return toPermissions.some((p: { role?: { id: Data.ID } | Data.ID }) => {
        const roleId = typeof p.role === 'object' ? p.role?.id : p.role;
        return roleId !== undefined && userRoleIds.has(roleId);
      });
    },
  };
};
