'use strict';

const { sanitize } = require('@strapi/utils');

const { getService } = require('../../../../utils');
const { validateUpdateStages, validateStage } = require('../../../../validation/review-workflows');
const { STAGE_MODEL_UID } = require('../../../../constants/workflows');

function sanitizeOutput({ strapi }, data, ctx) {
  const schema = strapi.getModel(STAGE_MODEL_UID);
  const { auth } = ctx.state;

  return sanitize.contentAPI.output(data, schema, { auth });
}

function sanitizeQuery({ strapi }, data, ctx) {
  const schema = strapi.getModel(STAGE_MODEL_UID);
  const { auth } = ctx.state;

  return sanitize.contentAPI.query(data, schema, { auth });
}

module.exports = {
  /**
   * Get one stage
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findById(ctx) {
    const { id, workflow_id: workflowId } = ctx.params;
    const { populate } = await sanitizeQuery({ strapi }, ctx.query, ctx);
    const stagesService = getService('stages');

    const data = await stagesService.findById(id, {
      workflowId,
      populate,
    });

    ctx.body = {
      data: await sanitizeOutput({ strapi }, data, ctx),
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

    const data = await stagesService.replaceWorkflowStages(workflowId, stagesValidated, {
      populate: ['stages'],
    });

    ctx.body = { data: await sanitizeOutput({ strapi }, data, ctx) };
  },

  /**
   * Update a specific stage
   * @param {import('koa').BaseContext} ctx - koa context
   *
   */
  async updateOne(ctx) {
    const { id: stageId } = ctx.params;
    const stagesService = getService('stages');
    const {
      body: { data: stage },
    } = ctx.request;

    const stageValidated = await validateStage(stage);

    const data = await stagesService.update(stageId, stageValidated);

    ctx.body = { data: await sanitizeOutput({ strapi }, data, ctx) };
  },

  /**
   * Create a new stage at the end of the targeted workflow
   * @param {import('koa').BaseContext} ctx - koa context
   *
   */
  async create(ctx) {
    const { workflow_id: workflowId } = ctx.params;
    const stagesService = getService('stages');
    const {
      body: { data: stage },
    } = ctx.request;

    const stageValidated = await validateStage(stage);

    const data = await stagesService.create(
      { ...stageValidated, workflow: workflowId },
      { fields: ['id', 'name', 'color'] }
    );

    ctx.body = { data: await sanitizeOutput({ strapi }, data, ctx) };
  },
};
