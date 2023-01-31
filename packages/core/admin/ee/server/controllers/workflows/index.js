'use strict';

const { getService } = require('../../utils');

module.exports = {
  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const workflowService = getService('workflows');
    const data = await workflowService.find({});

    ctx.body = {
      data,
    };
  },
  /**
   * Get one workflow based on its id contained in request parameters
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findOne(ctx) {
    const { id } = ctx.params;

    const workflowService = getService('workflows');
    const data = await workflowService.findById(id);

    ctx.body = {
      data,
    };
  },
};
