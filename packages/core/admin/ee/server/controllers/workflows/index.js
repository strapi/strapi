'use strict';

const { getService } = require('../../utils');

const {
  validateWorkflowCreate,
  validateWorkflowUpdate,
} = require('../../validation/review-workflows');

module.exports = {
  /**
   * Create a new workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async create(ctx) {
    const { body } = ctx.request;
    const { populate } = ctx.query;

    const workflowBody = await validateWorkflowCreate(body);

    const workflowService = getService('workflows');
    const data = await workflowService.create({ data: workflowBody, populate });

    ctx.body = {
      data,
    };
  },

  /**
   * Update a workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;
    const { populate } = ctx.query;
    const workflowService = getService('workflows');

    const workflowBody = await validateWorkflowUpdate(body);

    const workflow = await workflowService.findById(id, { populate: ['stages'] });
    if (!workflow) {
      return ctx.notFound();
    }

    const data = await workflowService.update(workflow, { data: workflowBody, populate });

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
