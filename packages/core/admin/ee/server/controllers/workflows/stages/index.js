'use strict';

const { ApplicationError } = require('@strapi/utils/lib/errors');
const { getService } = require('../../../utils');
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

  async updateEntity(ctx) {
    const stagesService = getService('stages');
    const reviewWorkflowsService = getService('review-workflows');
    const { model_uid: modelUID, id: entityId } = ctx.params;

    const { id: stageId } = await validateUpdateStageOnEntity(
      ctx.request?.body?.data,
      'You shall pass an id to the body of the put request.'
    );

    if (!reviewWorkflowsService.isReviewWorkflowEnabled({ strapi }, modelUID)) {
      throw new ApplicationError(`Review workflows is not activated on ${modelUID}.`);
    }

    // TODO When multiple workflows are possible, check if the stage is part of the right one
    // Didn't need this today as their can only be one workflow

    ctx.body = await stagesService.updateEntity({ id: entityId, modelUID }, stageId);
  },
};
