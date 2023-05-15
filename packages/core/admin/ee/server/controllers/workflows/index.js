'use strict';

const { getService } = require('../../utils');

const { validateWorkflowCreate } = require('../../validation/review-workflows');

module.exports = {
  /**
   * Create a new workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async create(ctx) {
    const { body } = ctx.request;
    const { populate } = ctx.query;

    const workflow = await validateWorkflowCreate(body);

    const workflowService = getService('workflows');
    const data = await workflowService.create({ data: workflow, populate });

    ctx.body = {
      data,
    };
  },
  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const { populate } = ctx.query;
    const workflowService = getService('workflows');
    const data = await workflowService.find({
      populate,
    });

    ctx.body = {
      data,
    };
  },
  /**
   * Get one workflow based on its id contained in request parameters
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findById(ctx) {
    const { id } = ctx.params;
    const { populate } = ctx.query;

    const workflowService = getService('workflows');
    const data = await workflowService.findById(id, { populate });

    ctx.body = {
      data,
    };
  },
};
