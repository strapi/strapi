import type { Core } from '@strapi/types';
import { filter, forEach, pipe, map, stubTrue, cond, defaultsDeep } from 'lodash/fp';
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
      contentTypes: [],
      stages: defaultStages,
    };

    await workflowsService.create({ data: workflow });
  }
}

const setRelation = (attributeName: any, target: any) => (contentType: any) => {
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

const setStageAttribute = setRelation(ENTITY_STAGE_ATTRIBUTE, STAGE_MODEL_UID);
const setAssigneeAttribute = setRelation(ENTITY_ASSIGNEE_ATTRIBUTE, 'admin::user');

const setReviewWorkflowAttributes = (contentType: any) => {
  setStageAttribute(contentType);
  setAssigneeAttribute(contentType);
};

function extendReviewWorkflowContentTypes({ strapi }: { strapi: Core.LoadedStrapi }) {
  const extendContentType = (contentTypeUID: any) => {
    strapi.get('content-types').extend(contentTypeUID, setReviewWorkflowAttributes);
  };

  pipe([
    getVisibleContentTypesUID,
    // Iterate over UIDs to extend the content-type
    forEach(extendContentType),
  ])(strapi.contentTypes);
}

function persistStagesJoinTables({ strapi }: { strapi: Core.LoadedStrapi }) {
  return async ({ contentTypes }: any) => {
    const getStageTableToPersist = (contentTypeUID: any) => {
      // Persist the stage join table
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID) as any;
      const joinTableName = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable.name;
      return {
        name: joinTableName,
        dependsOn: [{ name: tableName }],
      };
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

const registerWebhookEvents = async ({ strapi }: { strapi: Core.LoadedStrapi }) =>
  Object.entries(webhookEvents).forEach(([eventKey, event]) =>
    strapi.webhookStore.addAllowedEvent(eventKey, event)
  );

export default ({ strapi }: { strapi: Core.LoadedStrapi }) => {
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
