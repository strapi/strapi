import { defaultsDeep, filter, pipe, map } from 'lodash/fp';

import type { Core, UID } from '@strapi/types';

import { getService, getAdminService } from './utils';
import migrateStageAttribute from './migrations/shorten-stage-attribute';
import migrateReviewWorkflowStagesColor from './migrations/set-stages-default-color';
import migrateReviewWorkflowStagesRoles from './migrations/set-stages-roles';
import migrateReviewWorkflowName from './migrations/set-workflow-default-name';
import migrateWorkflowsContentTypes from './migrations/multiple-workflows';
import migrateDeletedCTInWorkflows from './migrations/handle-deleted-ct-in-workflows';
import reviewWorkflowsMiddlewares from './middlewares/review-workflows';

import { getVisibleContentTypesUID, hasStageAttribute } from './utils/review-workflows';

import {
  ENTITY_STAGE_ATTRIBUTE,
  ENTITY_ASSIGNEE_ATTRIBUTE,
  STAGE_MODEL_UID,
  MAX_WORKFLOWS,
  MAX_STAGES_PER_WORKFLOW,
} from './constants/workflows';

const setRelation = (attributeName: any, target: any, contentType: any) => {
  Object.assign(contentType.attributes, {
    [attributeName]: {
      writable: true,
      private: false,
      configurable: false,
      visible: false,
      useJoinTable: true, // We want a join table to persist data when downgrading to CE
      type: 'relation',
      relation: 'oneToOne',
      target,
    },
  });

  return contentType;
};

/**
 * Add the stage and assignee attributes to content types
 */
function extendReviewWorkflowContentTypes({ strapi }: { strapi: Core.Strapi }) {
  const contentTypeToExtend = getVisibleContentTypesUID(strapi.contentTypes);

  for (const contentTypeUID of contentTypeToExtend) {
    strapi.get('content-types').extend(contentTypeUID, (contentType: any) => {
      // Set Stage attribute
      setRelation(ENTITY_STAGE_ATTRIBUTE, STAGE_MODEL_UID, contentType);
      // Set Assignee attribute
      setRelation(ENTITY_ASSIGNEE_ATTRIBUTE, 'admin::user', contentType);
    });
  }
}

/**
 * Persist the stage & assignee attributes so they are not removed when downgrading to CE.
 *
 * TODO: V6 - Instead of persisting the join tables, always create the stage & assignee attributes, even in CE mode
 *            It was decided in V4 & V5 to not expose them in CE (as they pollute the CTs) but it's not worth given the complexity this needs
 */
function persistRWOnDowngrade({ strapi }: { strapi: Core.Strapi }) {
  const { removePersistedTablesWithSuffix, persistTables } = getAdminService('persist-tables');

  return async ({ contentTypes }: { contentTypes: Record<UID.ContentType, any> }) => {
    const getStageTableToPersist = (contentTypeUID: UID.ContentType) => {
      // Persist the stage join table
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID) as any;
      const joinTableName = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable.name;
      return {
        name: joinTableName,
        dependsOn: [{ name: tableName }],
      };
    };

    const getAssigneeTableToPersist = (contentTypeUID: UID.ContentType) => {
      // Persist the assignee join table
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID) as any;
      const joinTableName = attributes[ENTITY_ASSIGNEE_ATTRIBUTE].joinTable.name;
      return {
        name: joinTableName,
        dependsOn: [{ name: tableName }],
      };
    };

    const enabledRWContentTypes = pipe([
      getVisibleContentTypesUID,
      filter((uid: UID.ContentType) => hasStageAttribute(contentTypes[uid])),
    ])(contentTypes);

    // Remove previously created join tables and persist the new ones
    const stageJoinTablesToPersist = enabledRWContentTypes.map(getStageTableToPersist);
    await removePersistedTablesWithSuffix('_strapi_stage_lnk');
    await persistTables(stageJoinTablesToPersist);

    // Remove previously created join tables and persist the new ones
    const assigneeJoinTablesToPersist = enabledRWContentTypes.map(getAssigneeTableToPersist);
    await removePersistedTablesWithSuffix('_strapi_assignee_lnk');
    await persistTables(assigneeJoinTablesToPersist);
  };
}

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Data Migrations
  strapi.hook('strapi::content-types.beforeSync').register(migrateStageAttribute);
  strapi.hook('strapi::content-types.afterSync').register(persistRWOnDowngrade({ strapi }));
  strapi
    .hook('strapi::content-types.afterSync')
    .register(migrateReviewWorkflowStagesColor)
    .register(migrateReviewWorkflowStagesRoles)
    .register(migrateReviewWorkflowName)
    .register(migrateWorkflowsContentTypes)
    .register(migrateDeletedCTInWorkflows);

  // Middlewares
  reviewWorkflowsMiddlewares.contentTypeMiddleware(strapi);

  // Schema customization
  extendReviewWorkflowContentTypes({ strapi });

  // License limits
  const reviewWorkflowsOptions = defaultsDeep(
    {
      numberOfWorkflows: MAX_WORKFLOWS,
      stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
    },
    strapi.ee.features.get('review-workflows')
  );
  const workflowsValidationService = getService('validation', { strapi });
  workflowsValidationService.register(reviewWorkflowsOptions);
};
