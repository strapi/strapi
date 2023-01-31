'use strict';

const { getService } = require('../../../utils');

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
  async findOne(ctx) {
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
};
