'use strict';

const { set, get, forEach, keys, pickBy, pipe, isUndefined } = require('lodash/fp');
const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../utils');

const defaultStages = require('../../constants/default-stages.json');
const defaultWorkflow = require('../../constants/default-workflow.json');
const { WORKFLOW_MODEL_UID, ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');

const getContentTypeUIDsWithActivatedReviewWorkflows = pipe([
  // Pick only content-types with reviewWorkflows options set to true
  pickBy(get('options.reviewWorkflows')),
  // Get UIDs
  keys,
]);

/**
 * Map every stage in the array to be ordered in the relation
 * @param {Object[]} stages
 * @param {number} stages.id
 * @return {Object[]}
 */
function buildStagesConnectArray(stages) {
  return stages.map((stage, index) => {
    const connect = {
      id: stage.id,
      position: {},
    };

    if (index === 0) {
      connect.position.start = true;
    } else {
      connect.position.after = stages[index - 1].id;
    }
    return connect;
  });
}

async function initDefaultWorkflow({ workflowsService, stagesService }) {
  const wfCount = await workflowsService.count();
  const stagesCount = await stagesService.count();

  // Check if there is nothing about review-workflow in DB
  // If any, the feature has already been initialized with a workflow and stages
  if (wfCount === 0 && stagesCount === 0) {
    const stages = await stagesService.createMany(defaultStages, { fields: ['id'] });
    const workflow = {
      ...defaultWorkflow,
      stages: {
        connect: buildStagesConnectArray(stages),
      },
    };

    await workflowsService.create(workflow);
    // If there is any manually activated RW on content-types, we want to migrate the related entities
    await enableReviewWorkflow({ strapi })({ contentTypes: strapi.contentTypes });
  }
}

const setStageAttribute = set(`attributes.${ENTITY_STAGE_ATTRIBUTE}`, {
  writable: true,
  private: false,
  configurable: true,
  visible: true,
  type: 'relation',
  relation: 'morphOne',
  target: 'admin::workflow-stage',
  morphBy: 'related',
});

function extendReviewWorkflowContentTypes({ strapi }) {
  const extendContentType = (contentTypeUID) => {
    strapi.container.get('content-types').extend(contentTypeUID, setStageAttribute);
  };
  pipe([
    getContentTypeUIDsWithActivatedReviewWorkflows,
    // Iterate over UIDs to extend the content-type
    forEach(extendContentType),
  ])(strapi.contentTypes);
}

function enableReviewWorkflow({ strapi }) {
  return async ({ contentTypes }) => {
    const nowDate = Date.now();
    // TODO To be refactored when multiple workflows are added
    const defaultWorkflow = await strapi
      .query(WORKFLOW_MODEL_UID)
      .findOne({ populate: ['stages'] });

    // This is possible if this is the first start of EE, there won't be any workflow in DB before bootstrap
    if (!defaultWorkflow) {
      return;
    }
    const firstStage = defaultWorkflow.stages[0];
    const up = async (contentTypeUID) => {
      const contentTypeQuery = strapi.query(contentTypeUID);
      const limit = 1000;
      const getEntitiesToUpdate = (offset) =>
        contentTypeQuery.findMany(contentTypeUID, {
          select: 'id',
          where: { [ENTITY_STAGE_ATTRIBUTE]: null },
          limit,
          offset,
        });

      const dateBeforeUpdate = Date.now();
      for (let count; isUndefined(count) || (count % limit === 0 && count !== 0); ) {
        const entitiesToUpdate = await getEntitiesToUpdate(count ?? 0);
        count = (count ?? 0) + entitiesToUpdate.length;
        await mapAsync(entitiesToUpdate, async ({ id }) =>
          contentTypeQuery.updateRelations(id, { [ENTITY_STAGE_ATTRIBUTE]: firstStage })
        );
        console.log(
          `Time spent on ${entitiesToUpdate.length} (count: ${count}): ${
            Date.now() - dateBeforeUpdate
          }ms`
        );
      }
      console.log(
        `Time spent on enabling RW for ${contentTypeUID}: ${Date.now() - dateBeforeUpdate}ms`
      );
    };

    const result = await pipe([
      getContentTypeUIDsWithActivatedReviewWorkflows,
      // Iterate over UIDs to extend the content-type
      (contentTypesUIDs) => mapAsync(contentTypesUIDs, up),
    ])(contentTypes);
    console.log(`Performance for enableReviewWorkflow: ${Date.now() - nowDate}ms`);
    return result;
  };
}

module.exports = ({ strapi }) => {
  const workflowsService = getService('workflows', { strapi });
  const stagesService = getService('stages', { strapi });

  return {
    async bootstrap() {
      await initDefaultWorkflow({ workflowsService, stagesService });
    },
    async register() {
      extendReviewWorkflowContentTypes({ strapi });
      strapi.hook('strapi::content-types.afterSync').register(enableReviewWorkflow({ strapi }));
    },
  };
};
