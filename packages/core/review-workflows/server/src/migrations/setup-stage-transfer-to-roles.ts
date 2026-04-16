import { STAGE_TRANSITION_UID, STAGE_MODEL_UID } from '../constants/workflows';
import { getService } from '../utils';

/**
 * Migrate review workflow stages to have "to" RBAC permissions for all roles.
 */
async function migrateReviewWorkflowStagesTransferToRoles({ oldContentTypes, contentTypes }: any) {
  const hadToPermissions = !!oldContentTypes?.[STAGE_MODEL_UID]?.attributes?.toPermissions;
  const hasToPermissions = !!contentTypes?.[STAGE_MODEL_UID]?.attributes?.toPermissions;

  // If the stage content type did not have toPermissions in the previous version
  // then we set the "to" permissions of every stage to be every current role in the app.
  // This ensures consistent behaviour when upgrading to a strapi version with review workflows "to" RBAC.
  if (!hadToPermissions && hasToPermissions) {
    const roleUID = 'admin::role';
    strapi.log.info(
      `Migrating all existing review workflow stages to have "to" RBAC permissions for all ${roleUID}.`
    );

    const stagePermissionsService = getService('stage-permissions');

    const stages = await strapi.db.query(STAGE_MODEL_UID).findMany();
    const roles = await strapi.db.query(roleUID).findMany();

    // Collect the permissions to add and group them by stage id.
    const groupedPermissions = {} as Record<
      number,
      { roleId: number; toStage: number; action: string }[]
    >;
    roles
      .map((role) => role.id)
      .forEach((roleId) => {
        stages
          .map((stage) => stage.id)
          .forEach((stageId) => {
            if (!groupedPermissions[stageId]) {
              groupedPermissions[stageId] = [];
            }

            groupedPermissions[stageId].push({
              roleId,
              toStage: stageId,
              action: STAGE_TRANSITION_UID,
            });
          });
      });

    for (const [stageId, permissions] of Object.entries(groupedPermissions)) {
      const numericalStageId = Number(stageId);

      if (Number.isNaN(numericalStageId)) {
        strapi.log.warn(
          `Unable to apply ${roleUID} "to" migration for ${STAGE_MODEL_UID} with id ${stageId}. The stage does not have a numerical id.`
        );
        continue;
      }

      // Register the "to" permissions for this stage
      const stageToPermissions = await stagePermissionsService.registerManyTo(permissions);

      // Read existing permissions so we don't overwrite "from" permissions
      const existingStage = await strapi.db.query(STAGE_MODEL_UID).findOne({
        where: { id: numericalStageId },
        populate: { permissions: true },
      });

      const existingPermissionIds = (existingStage?.permissions || []).map(
        (p: { id: number }) => p.id
      );
      const newPermissionIds = stageToPermissions
        .flat()
        .map((permission: { id: number }) => permission.id);

      // Update the stage with merged permissions (existing "from" + new "to")
      await strapi.db.query(STAGE_MODEL_UID).update({
        where: { id: numericalStageId },
        data: {
          permissions: [...existingPermissionIds, ...newPermissionIds],
        },
      });
    }
  }
}

export default migrateReviewWorkflowStagesTransferToRoles;
