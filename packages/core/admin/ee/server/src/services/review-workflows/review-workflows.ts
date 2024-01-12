import { LoadedStrapi as Strapi } from '@strapi/types';
import { filter, set, forEach, pipe, map, stubTrue, cond, defaultsDeep } from 'lodash/fp';
import { getService } from '../../utils';
import { getVisibleContentTypesUID, hasStageAttribute } from '../../utils/review-workflows';
import defaultStages from '../../constants/default-stages.json';
import defaultWorkflow from '../../constants/default-workflow.json';
import {
  ENTITY_STAGE_ATTRIBUTE,
  ENTITY_ASSIGNEE_ATTRIBUTE,
  STAGE_MODEL_UID,
  MAX_WORKFLOWS,
  MAX_STAGES_PER_WORKFLOW,
} from '../../constants/workflows';

import { persistTables, removePersistedTablesWithSuffix } from '../../utils/persisted-tables';
import webhookEvents from '../../constants/webhookEvents';

const MAX_DB_TABLE_NAME_LEN = 63; // Postgres limit
// The longest index name that Strapi can create is prefixed with '_strapi_stage_links_inv_fk', so the content type name  should be no longer than this.
const MAX_JOIN_TABLE_NAME_SUFFIX =
  1 /* _ */ + ENTITY_STAGE_ATTRIBUTE.length + '_links_inv_fk'.length;
const MAX_CONTENT_TYPE_NAME_LEN = MAX_DB_TABLE_NAME_LEN - MAX_JOIN_TABLE_NAME_SUFFIX;

const DEFAULT_OPTIONS = {
  numberOfWorkflows: MAX_WORKFLOWS,
  stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
};

async function initDefaultWorkflow({ workflowsService, stagesService }: any) {
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

function extendReviewWorkflowContentTypes({ strapi }: { strapi: Strapi }) {
  const extendContentType = (contentTypeUID: any) => {
    const assertContentTypeCompatibility = (contentType: any) =>
      contentType.collectionName.length <= MAX_CONTENT_TYPE_NAME_LEN;
    const incompatibleContentTypeAlert = (contentType: any) => {
      strapi.log.warn(
        `Review Workflow cannot be activated for the content type with the name '${contentType.info.displayName}' because the name exceeds the maximum length of ${MAX_CONTENT_TYPE_NAME_LEN} characters.`
      );
      return contentType;
    };

    const setRelation = (path: any, target: any) =>
      set(path, {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        useJoinTable: true, // We want a join table to persist data when downgrading to CE
        type: 'relation',
        relation: 'oneToOne',
        target,
      });

    const setReviewWorkflowAttributes = pipe([
      setRelation(`attributes.${ENTITY_STAGE_ATTRIBUTE}`, STAGE_MODEL_UID),
      setRelation(`attributes.${ENTITY_ASSIGNEE_ATTRIBUTE}`, 'admin::user'),
    ]);

    const extendContentTypeIfCompatible = cond([
      [assertContentTypeCompatibility, setReviewWorkflowAttributes],
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

function persistStagesJoinTables({ strapi }: { strapi: Strapi }) {
  return async ({ contentTypes }: any) => {
    const getStageTableToPersist = (contentTypeUID: any) => {
      // Persist the stage join table
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID) as any;
      const joinTableName = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable.name;
      return { name: joinTableName, dependsOn: [{ name: tableName }] };
    };

    const joinTablesToPersist = pipe([
      getVisibleContentTypesUID,
      filter((uid: any) => hasStageAttribute(contentTypes[uid])),
      map(getStageTableToPersist),
    ])(contentTypes);

    // TODO: Instead of removing all the tables, we should only remove the ones that are not in the joinTablesToPersist
    await removePersistedTablesWithSuffix('_strapi_stage_links');
    await persistTables(joinTablesToPersist);
  };
}

const registerWebhookEvents = async ({ strapi }: { strapi: Strapi }) =>
  Object.entries(webhookEvents).forEach(([eventKey, event]) =>
    strapi.webhookStore.addAllowedEvent(eventKey, event)
  );

export default ({ strapi }: { strapi: Strapi }) => {
  const workflowsService = getService('workflows', { strapi });
  const stagesService = getService('stages', { strapi });
  const workflowsValidationService = getService('review-workflows-validation', { strapi });

  return {
    async bootstrap() {
      await registerWebhookEvents({ strapi });
      await initDefaultWorkflow({ workflowsService, stagesService, strapi });
    },
    async register({ options } = { options: {} }) {
      extendReviewWorkflowContentTypes({ strapi });
      strapi.hook('strapi::content-types.afterSync').register(persistStagesJoinTables({ strapi }));

      const reviewWorkflowsOptions = defaultsDeep(DEFAULT_OPTIONS, options);
      workflowsValidationService.register(reviewWorkflowsOptions);
    },
  };
};
