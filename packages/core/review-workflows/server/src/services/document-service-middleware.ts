import { Modules } from '@strapi/types';

import { isNil } from 'lodash/fp';
import { ENTITY_STAGE_ATTRIBUTE } from '../constants/workflows';
import { WORKFLOW_UPDATE_STAGE } from '../constants/webhook-events';
import { getService } from '../utils';

type Middleware = Modules.Documents.Middleware.Middleware;

/**
 * Get the stage information of an entity
 * @param {String} uid
 * @param {Number} id
 * @returns {Object}
 */
const getEntityStage = async (uid: any, id: any, params: any) => {
  const entity = await strapi.documents(uid).findOne({
    ...params,
    documentId: id,
    status: 'draft',
    populate: {
      [ENTITY_STAGE_ATTRIBUTE]: {
        populate: {
          workflow: true,
        },
      },
    },
  });

  return entity?.[ENTITY_STAGE_ATTRIBUTE] ?? {};
};

/**
 * Ensures the entity is assigned to the default workflow stage
 */
const assignStageOnCreate: Middleware = async (ctx, next) => {
  if (ctx.action !== 'create' && ctx.action !== 'clone') {
    return next();
  }

  /**
   * Content types can have assigned workflows,
   * if the CT has one, assign a default value to the stage attribute if it's not present
   */
  const workflow = await getService('workflows').getAssignedWorkflow(ctx.contentType.uid, {
    populate: 'stages',
  });

  if (!workflow) {
    return next();
  }

  const data = ctx.params.data as Record<string, any>;

  // Assign the default stage if the entity doesn't have one
  if (ctx.params?.data && isNil(data[ENTITY_STAGE_ATTRIBUTE])) {
    data[ENTITY_STAGE_ATTRIBUTE] = { id: workflow.stages[0].id };
  }

  return next();
};

const handleStageOnUpdate: Middleware = async (ctx, next) => {
  if (ctx.action !== 'update') {
    return next();
  }

  const { documentId } = ctx.params;
  const data = ctx.params.data as any;

  if (isNil(data?.[ENTITY_STAGE_ATTRIBUTE])) {
    delete data?.[ENTITY_STAGE_ATTRIBUTE];
    return next();
  }

  /**
   * Get last stage of the entity
   */
  const previousStage = await getEntityStage(ctx.contentType.uid, documentId, ctx.params);

  const result = await next();

  if (!result) {
    return result;
  }

  // @ts-expect-error
  const updatedStage = result?.[ENTITY_STAGE_ATTRIBUTE];

  // Stage might be null if field is not populated
  if (updatedStage && previousStage?.id && previousStage.id !== updatedStage.id) {
    const model = strapi.getModel(ctx.contentType.uid);

    strapi.eventHub.emit(WORKFLOW_UPDATE_STAGE, {
      model: model.modelName,
      uid: model.uid,
      // TODO v6: Rename to "entry", which is what is used for regular CRUD updates
      entity: {
        // @ts-expect-error
        id: result?.id,
        documentId,
        // @ts-expect-error
        locale: result?.locale,
        status: 'draft',
      },
      workflow: {
        id: previousStage.workflow.id,
        stages: {
          from: {
            id: previousStage.id,
            name: previousStage.name,
          },
          to: {
            id: updatedStage.id,
            name: updatedStage.name,
          },
        },
      },
    });
  }

  return next();
};

export default () => ({
  assignStageOnCreate,
  handleStageOnUpdate,
});
