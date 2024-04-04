// @ts-nocheck
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
  const entity = await strapi.documents(uid).findOne(id, {
    ...params,
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
  if (!['create', 'clone'].includes(ctx.action)) {
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

  /**
   * Doc service args might be formatted differently depending on the action
   * .create({ data }) => data
   * .clone(id, { data }) => data
   */
  const params: any = ctx.args.length > 1 ? ctx.args[1] : ctx.args[0];

  // Assign the default stage if the entity doesn't have one
  if (params?.data && isNil(params.data[ENTITY_STAGE_ATTRIBUTE])) {
    params.data[ENTITY_STAGE_ATTRIBUTE] = { id: workflow.stages[0].id };
  }

  return next();
};

const handleStageOnUpdate: Middleware = async (ctx, next) => {
  if (ctx.action !== 'update') {
    return next();
  }

  const [documentId, params] = ctx.args;
  // @ts-expect-error - Typescript doesn't know this should be the params of update
  const data = params?.data as any;

  if (isNil(data?.[ENTITY_STAGE_ATTRIBUTE])) {
    delete data?.[ENTITY_STAGE_ATTRIBUTE];
    return next();
  }

  /**
   * Get last stage of the entity
   */
  const previousStage = await getEntityStage(ctx.contentType.uid, documentId, params);

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
