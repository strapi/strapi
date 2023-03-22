'use strict';

const { set, get, forEach, keys, pickBy, pipe } = require('lodash/fp');
const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../utils');

const defaultStages = require('../../constants/default-stages.json');
const defaultWorkflow = require('../../constants/default-workflow.json');
const { ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');

const {
  disableOnContentTypes: disableReviewWorkflows,
} = require('../../migrations/review-workflows');
const { getDefaultWorkflow } = require('../../utils/review-workflows');

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
  configurable: false,
  visible: false,
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

    const up = async (contentTypeUID) => {
      const contentTypeMetadata = strapi.db.metadata.get(contentTypeUID);
      const { target, morphBy } = contentTypeMetadata.attributes[ENTITY_STAGE_ATTRIBUTE];
      const { joinTable } = strapi.db.metadata.get(target).attributes[morphBy];
      const { idColumn, typeColumn } = joinTable.morphColumn;

      const connection = strapi.db.getConnection();

      // Execute an SQL query to insert records into the join table mapping the specified content type with the first stage of the default workflow.
      // Only entities that do not have a record in the join table yet are selected.
      const selectStatement = connection
        .select({
          [idColumn.name]: 'entity.id',
          field: connection.raw('?', [ENTITY_STAGE_ATTRIBUTE]),
          order: 1,
          [joinTable.joinColumn.name]: firstStage.id,
          [typeColumn.name]: connection.raw('?', [contentTypeUID]),
        })
        .leftJoin(`${joinTable.name} AS jointable`, function () {
          this.on('entity.id', '=', `jointable.${idColumn.name}`).andOn(
            `jointable.${typeColumn.name}`,
            '=',
            connection.raw('?', [contentTypeUID])
          );
        })
        .where(`jointable.${idColumn.name}`, null)
        .from(`${contentTypeMetadata.tableName} AS entity`)
        .toSQL();

      const columnsToInsert = [
        idColumn.name,
        'field',
        connection.raw('??', ['order']),
        joinTable.joinColumn.name,
        typeColumn.name,
      ];

      // Insert rows for all entries of the content type that do not have a
      // default stage
      await connection(joinTable.name).insert(
        connection.raw(
          `(${columnsToInsert.join(',')})  ${selectStatement.sql}`,
          selectStatement.bindings
        )
      );
    };

    return pipe([
      getContentTypeUIDsWithActivatedReviewWorkflows,
      // Iterate over UIDs to extend the content-type
      (contentTypesUIDs) => mapAsync(contentTypesUIDs, up),
    ])(contentTypes);
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
      strapi.hook('strapi::content-types.afterSync').register(disableReviewWorkflows);
    },
  };
};
