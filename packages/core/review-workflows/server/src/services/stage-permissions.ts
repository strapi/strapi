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
    async register({ roleId, action, fromStage }: any) {
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
    async registerMany(permissions: any) {
      return async.map(permissions, this.register);
    },
    async registerTo({ roleId, action, toStage }: any) {
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
    async registerManyTo(permissions: any) {
      return async.map(permissions, this.registerTo);
    },
    async unregister(permissions: any) {
      const permissionIds = permissions.map(prop('id'));
      await permissionService.deleteByIds(permissionIds);
    },
    can(action: any, fromStage: any) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      const userRoles = requestState.user?.roles;
      if (userRoles?.some((role: any) => role.code === 'strapi-super-admin')) {
        return true;
      }

      return requestState.userAbility.can({
        name: action,
        params: { from: fromStage },
      });
    },
    async canTransitionToStage(toStageId: any) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      const userRoles = requestState.user?.roles;
      if (userRoles?.some((role: any) => role.code === 'strapi-super-admin')) {
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
    canTransitionToStageWithPermissions(stage: any) {
      const requestState = strapi.requestContext.get()?.state;

      if (!requestState) {
        return false;
      }

      const userRoles = requestState.user?.roles;
      if (userRoles?.some((role: any) => role.code === 'strapi-super-admin')) {
        return true;
      }

      const toPermissions = (stage.permissions || []).filter((p: any) => p.actionParameters?.to);

      const userRoleIds = new Set(userRoles.map((role: any) => role.id));

      return toPermissions.some((p: any) => userRoleIds.has(p.role?.id ?? p.role));
    },
  };
};
