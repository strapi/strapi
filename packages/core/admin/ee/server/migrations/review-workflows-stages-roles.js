'use strict';

const { STAGE_TRANSITION_UID, STAGE_MODEL_UID } = require('../constants/workflows');
const { getService } = require('../utils');

async function migrateReviewWorkflowStagesRoles({ oldContentTypes, contentTypes }) {
  const stageUID = 'admin::workflow-stage';
  const hadRolePermissions = !!oldContentTypes?.[stageUID]?.attributes?.permissions;
  const hasRolePermissions = !!contentTypes?.[stageUID]?.attributes?.permissions;

  // If the stage content type did not have permissions in the previous version
  // then we set the permissions of every stage to be every current role in the app.
  // This ensures consistent behaviour when upgrading to a strapi version with review workflows RBAC.
  if (!hadRolePermissions && hasRolePermissions) {
    const stagePermissionsService = getService('stage-permissions');

    const stages = await strapi.query(stageUID).findMany();
    const roles = await strapi.query('admin::role').findMany();

    // Collect the permissions to add and group them by stage id.
    const groupedPermissions = {};
    roles
      .map((role) => role.id)
      .forEach((id) => {
        stages
          .map((stage) => stage.id)
          .forEach((stageId) => {
            if (!groupedPermissions[stageId]) {
              groupedPermissions[stageId] = [];
            }

            groupedPermissions[stageId].push({
              roleId: id,
              fromStage: stageId,
              action: STAGE_TRANSITION_UID,
            });
          });
      });

    for (const [stageId, permissions] of Object.entries(groupedPermissions)) {
      // Register the permissions for this stage
      const stagePermissions = await stagePermissionsService.registerMany(permissions);

      // Update the stage with its new permissions
      await strapi.entityService.update(STAGE_MODEL_UID, Number(stageId), {
        data: {
          permissions: stagePermissions.flat().map((p) => p.id),
        },
      });
    }
  }
}

module.exports = migrateReviewWorkflowStagesRoles;
