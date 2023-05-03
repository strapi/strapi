'use strict';

const { set, forEach, pipe, map } = require('lodash/fp');
const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../utils');
const { getContentTypeUIDsWithActivatedReviewWorkflows } = require('../../utils/review-workflows');

const defaultStages = require('../../constants/default-stages.json');
const defaultWorkflow = require('../../constants/default-workflow.json');
const { ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');

const { getDefaultWorkflow } = require('../../utils/review-workflows');
const { persistTables, removePersistedTablesWithSuffix } = require('../../utils/persisted-tables');

async function initDefaultWorkflow({ workflowsService, stagesService, strapi }) {
  const wfCount = await workflowsService.count();
  const stagesCount = await stagesService.count();

  // Check if there is nothing about review-workflow in DB
  // If any, the feature has already been initialized with a workflow and stages
  if (wfCount === 0 && stagesCount === 0) {
    const stages = await stagesService.createMany(defaultStages, { fields: ['id'] });
    const workflow = {
      ...defaultWorkflow,
      stages: {
        connect: stages.map((stage) => stage.id),
      },
    };

    await workflowsService.create(workflow);
    // If there is any manually activated RW on content-types, we want to migrate the related entities
    await enableReviewWorkflow({ strapi })({ contentTypes: strapi.contentTypes });
  }
}

function extendReviewWorkflowContentTypes({ strapi }) {
  const extendContentType = (contentTypeUID) => {
    const setStageAttribute = set(`attributes.${ENTITY_STAGE_ATTRIBUTE}`, {
      writable: true,
      private: false,
      configurable: false,
      visible: false,
      useJoinTable: true, // We want a join table to persist data when downgrading to CE
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::workflow-stage',
    });
    strapi.container.get('content-types').extend(contentTypeUID, setStageAttribute);
  };
  pipe([
    getContentTypeUIDsWithActivatedReviewWorkflows,
    // Iterate over UIDs to extend the content-type
    forEach(extendContentType),
  ])(strapi.contentTypes);
}

/**
 * Enables the review workflow for the given content types.
 * @param {Object} strapi - Strapi instance
 */
function enableReviewWorkflow({ strapi }) {
  /**
   * @param {Array<string>} contentTypes - Content type UIDs to enable the review workflow for.
   * @returns {Promise<void>} - Promise that resolves when the review workflow is enabled.
   */
  return async ({ contentTypes }) => {
    const defaultWorkflow = await getDefaultWorkflow({ strapi });
    // This is possible if this is the first start of EE, there won't be any workflow in DB before bootstrap
    if (!defaultWorkflow) {
      return;
    }
    const firstStage = defaultWorkflow.stages[0];
    const stagesService = getService('stages', { strapi });

    const updateEntitiesStage = async (contentTypeUID) => {
      // Update CT entities stage
      return stagesService.updateEntitiesStage(contentTypeUID, {
        fromStageId: null,
        toStageId: firstStage.id,
      });
    };

    return pipe([
      getContentTypeUIDsWithActivatedReviewWorkflows,
      // Iterate over UIDs to extend the content-type
      (contentTypesUIDs) => mapAsync(contentTypesUIDs, updateEntitiesStage),
    ])(contentTypes);
  };
}

function persistStagesJoinTables({ strapi }) {
  return async ({ contentTypes }) => {
    const getStageTableToPersist = (contentTypeUID) => {
      // Persist the stage join table
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID);
      const joinTableName = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable.name;
      return { name: joinTableName, dependsOn: [{ name: tableName }] };
    };

    const joinTablesToPersist = pipe([
      getContentTypeUIDsWithActivatedReviewWorkflows,
      map(getStageTableToPersist),
    ])(contentTypes);

    // TODO: Instead of removing all the tables, we should only remove the ones that are not in the joinTablesToPersist
    await removePersistedTablesWithSuffix('_strapi_review_workflows_stage_links');
    await persistTables(joinTablesToPersist);
  };
}

module.exports = ({ strapi }) => {
  const workflowsService = getService('workflows', { strapi });
  const stagesService = getService('stages', { strapi });

  return {
    async bootstrap() {
      await initDefaultWorkflow({ workflowsService, stagesService, strapi });
    },
    async register() {
      extendReviewWorkflowContentTypes({ strapi });
      strapi.hook('strapi::content-types.afterSync').register(enableReviewWorkflow({ strapi }));
      strapi.hook('strapi::content-types.afterSync').register(persistStagesJoinTables({ strapi }));
    },
  };
};
