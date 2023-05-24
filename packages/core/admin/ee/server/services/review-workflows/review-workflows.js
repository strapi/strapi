'use strict';

const { has, filter, set, forEach, pipe, map, stubTrue, cond } = require('lodash/fp');
const { getService } = require('../../utils');
const { getVisibleContentTypesUID } = require('../../utils/review-workflows');

const defaultStages = require('../../constants/default-stages.json');
const defaultWorkflow = require('../../constants/default-workflow.json');
const { ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');

const { persistTables, removePersistedTablesWithSuffix } = require('../../utils/persisted-tables');

const MAX_DB_TABLE_NAME_LEN = 63; // Postgres limit
// The suffix should looks like _strapi_reviewWorkflow_stage_links_inv_fk
const MAX_JOIN_TABLE_NAME_SUFFIX =
  1 /* _ */ + ENTITY_STAGE_ATTRIBUTE.length + '_links_inv_fk'.length;
const MAX_CONTENT_TYPE_NAME_LEN = MAX_DB_TABLE_NAME_LEN - MAX_JOIN_TABLE_NAME_SUFFIX;

async function initDefaultWorkflow({ workflowsService, stagesService }) {
  const wfCount = await workflowsService.count();
  const stagesCount = await stagesService.count();

  // Check if there is nothing about review-workflow in DB
  // If any, the feature has already been initialized with a workflow and stages
  if (wfCount === 0 && stagesCount === 0) {
    const workflow = {
      ...defaultWorkflow,
      stages: defaultStages,
    };

    await workflowsService.create({ data: workflow });
  }
}

function extendReviewWorkflowContentTypes({ strapi }) {
  const extendContentType = (contentTypeUID) => {
    const assertContentTypeCompatibility = (contentType) =>
      contentType.collectionName.length <= MAX_CONTENT_TYPE_NAME_LEN;
    const incompatibleContentTypeAlert = (contentType) => {
      strapi.log.warn(
        `Content type "${contentType.info.displayName}" cannot have Review Workflow activated as the name is too long. (${MAX_CONTENT_TYPE_NAME_LEN} maximum characters)`
      );
      return contentType;
    };
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

    const extendContentTypeIfCompatible = cond([
      [assertContentTypeCompatibility, setStageAttribute],
      [stubTrue, incompatibleContentTypeAlert],
    ]);
    strapi.container.get('content-types').extend(contentTypeUID, extendContentTypeIfCompatible);
  };

  pipe([
    getVisibleContentTypesUID,
    // Iterate over UIDs to extend the content-type
    forEach(extendContentType),
  ])(strapi.contentTypes);
}

function persistStagesJoinTables({ strapi }) {
  return async ({ contentTypes }) => {
    const hasStageAttribute = has('attributes', ENTITY_STAGE_ATTRIBUTE);
    const getStageTableToPersist = (contentTypeUID) => {
      // Persist the stage join table
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID);
      const joinTableName = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable.name;
      return { name: joinTableName, dependsOn: [{ name: tableName }] };
    };

    const joinTablesToPersist = pipe([
      getVisibleContentTypesUID,
      filter(hasStageAttribute),
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
      strapi.hook('strapi::content-types.afterSync').register(persistStagesJoinTables({ strapi }));
    },
  };
};
