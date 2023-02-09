'use strict';

const { getService } = require('../../../utils');
const { validateUpdateStages } = require('../../../validation/review-workflows');

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
    const { body: stages } = ctx.request;

    const stagesValidated = await validateUpdateStages(stages);

    const data = await stagesService.replaceWorkflowStages(workflowId, stagesValidated);

    ctx.body = { data };
  },
};
