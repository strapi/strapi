'use strict';

const { ApplicationError } = require('@strapi/utils/lib/errors');
const { getService } = require('../../../utils');
const { hasReviewWorkflow } = require('../../../utils/review-workflows');
const {
  validateUpdateStages,
  validateUpdateStageOnEntity,
} = require('../../../validation/review-workflows');

module.exports = {
  /**
   * List all stages
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const { workflow_id: workflowId } = ctx.params;
    const { populate } = ctx.query;
    const stagesService = getService('stages');

    const data = await stagesService.find({
      workflowId,
      populate,
    });

    ctx.body = {
      data,
    };
  },
  /**
   * Get one stage
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findById(ctx) {
    const { id, workflow_id: workflowId } = ctx.params;
    const { populate } = ctx.query;
    const stagesService = getService('stages');

    const data = await stagesService.findById(id, {
      workflowId,
      populate,
    });

    ctx.body = {
      data,
    };
  },

  /**
   * Replace all stages in a workflow
   * @param {import('koa').BaseContext} ctx - koa context
   *
   */
  async replace(ctx) {
    const { workflow_id: workflowId } = ctx.params;
    const stagesService = getService('stages');
    const {
      body: { data: stages },
    } = ctx.request;

    const stagesValidated = await validateUpdateStages(stages);

    const data = await stagesService.replaceWorkflowStages(workflowId, stagesValidated);

    ctx.body = { data };
  },

  /**
   * Updates an entity's stage.
   * @async
   * @param {Object} ctx - The Koa context object.
   * @param {Object} ctx.params - An object containing the parameters from the request URL.
   * @param {string} ctx.params.model_uid - The model UID of the entity.
   * @param {string} ctx.params.id - The ID of the entity to update.
   * @param {Object} ctx.request.body.data - Optional data object containing the new stage ID for the entity.
   * @param {string} ctx.request.body.data.id - The ID of the new stage for the entity.
   * @throws {ApplicationError} If review workflows is not activated on the specified model UID.
   * @throws {ValidationError} If the `data` object in the request body fails to pass validation.
   * @returns {Promise<void>} A promise that resolves when the entity's stage has been updated.
   */
  async updateEntity(ctx) {
    const stagesService = getService('stages');
    const { model_uid: modelUID, id: entityIdString } = ctx.params;
    const entityId = Number(entityIdString);

    const { id: stageId } = await validateUpdateStageOnEntity(
      ctx.request?.body?.data,
      'You should pass an id to the body of the put request.'
    );

    if (!hasReviewWorkflow({ strapi }, modelUID)) {
      throw new ApplicationError(`Review workflows is not activated on ${modelUID}.`);
    }

    // TODO When multiple workflows are possible, check if the stage is part of the right one
    // Didn't need this today as their can only be one workflow

    const data = await stagesService.updateEntity({ id: entityId, modelUID }, stageId);

    ctx.body = { data };
  },
};
