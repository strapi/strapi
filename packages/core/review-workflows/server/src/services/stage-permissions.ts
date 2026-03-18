import type { Core } from '@strapi/types';
import { prop } from 'lodash/fp';
import { async, errors } from '@strapi/utils';
import { getService, getAdminService } from '../utils';
import { STAGE_TRANSITION_UID, STAGE_MODEL_UID } from '../constants/workflows';

const { ApplicationError } = errors;
const validActions = [STAGE_TRANSITION_UID];

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const roleService = getAdminService('role');
  const permissionService = getAdminService('permission');

  return {
    async register({
      roleId,
      action,
      fromStage,
    }: {
      roleId: number;
      action: string;
      fromStage: number;
    }) {
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
    async registerMany(permissions: { roleId: number; action: string; fromStage: number }[]) {
      return async.map(permissions, this.register);
    },
    async registerTo({
      roleId,
      action,
      toStage,
    }: {
      roleId: number;
      action: string;
      toStage: number;
    }) {
      if (!validActions.includes(action)) {
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
    async registerManyTo(permissions: { roleId: number; action: string; toStage: number }[]) {
      return async.map(permissions, this.registerTo);
    },
    async unregister(permissions: { id: number }[]) {
      const permissionIds = permissions.map(prop('id'));
      await permissionService.deleteByIds(permissionIds);
    },
    can(action: string, fromStage: number) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      const userRoles = requestState.user?.roles;
      if (userRoles?.some((role: { code: string }) => role.code === 'strapi-super-admin')) {
        return true;
      }

      return requestState.userAbility.can({
        name: action,
        params: { from: fromStage },
      });
    },
    async canTransitionToStage(toStageId: number) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      const userRoles = requestState.user?.roles;
      if (userRoles?.some((role: { code: string }) => role.code === 'strapi-super-admin')) {
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
      permissions?: { actionParameters?: { to?: unknown }; role?: { id: number } | number }[];
    }) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      const userRoles = requestState.user?.roles;
      if (userRoles?.some((role: { code: string }) => role.code === 'strapi-super-admin')) {
        return true;
      }

      const toPermissions = (stage.permissions || []).filter(
        (p: { actionParameters?: { to?: unknown } }) => p.actionParameters?.to
      );

      const userRoleIds = new Set(userRoles.map((role: { id: number }) => role.id));

      return toPermissions.some((p: { role?: { id: number } | number }) => {
        const roleId = typeof p.role === 'object' ? p.role?.id : p.role;
        return roleId !== undefined && userRoleIds.has(roleId);
      });
    },
  };
};
