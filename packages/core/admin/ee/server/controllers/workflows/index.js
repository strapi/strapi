'use strict';

const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../utils');

const {
  validateWorkflowCreate,
  validateWorkflowUpdate,
} = require('../../validation/review-workflows');
const { WORKFLOW_MODEL_UID } = require('../../constants/workflows');

/**
 *
 * @param { Strapi } strapi - Strapi instance
 * @param userAbility
 * @param type - create a sanitizer for output or input
 * @return { (Workflow) => SanitizedWorkflow }
 */
function sanitizeWorkflow({ strapi }, userAbility, type = 'output') {
  const permissionChecker = strapi
    .plugin('content-manager')
    .service('permission-checker')
    .create({ userAbility, model: WORKFLOW_MODEL_UID });

  if (type === 'input') {
    return (entity) => permissionChecker.sanitizeInput(entity);
  }
  return (entity) => permissionChecker.sanitizeOutput(entity);
}

module.exports = {
  /**
   * Create a new workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async create(ctx) {
    const { body } = ctx.request;
    const { populate } = ctx.query;
    const inputSanitizer = sanitizeWorkflow({ strapi }, ctx.state.userAbility, 'input');
    const outputSanitizer = sanitizeWorkflow({ strapi }, ctx.state.userAbility, 'output');

    const workflowBody = await validateWorkflowCreate(body.data);

    const workflowService = getService('workflows');
    const createdWorkflow = await workflowService.create({
      data: await inputSanitizer(workflowBody),
      populate,
    });

    ctx.body = {
      data: await outputSanitizer(createdWorkflow),
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
    const inputSanitizer = sanitizeWorkflow({ strapi }, ctx.state.userAbility, 'input');
    const outputSanitizer = sanitizeWorkflow({ strapi }, ctx.state.userAbility, 'output');

    const workflowBody = await validateWorkflowUpdate(body.data);

    const workflow = await workflowService.findById(id, { populate: ['stages'] });
    if (!workflow) {
      return ctx.notFound();
    }

    const updatedWorkflow = await workflowService.update(workflow, {
      data: await inputSanitizer(workflowBody),
      populate,
    });

    ctx.body = {
      data: await outputSanitizer(updatedWorkflow),
    };
  },

  /**
   * Delete a workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async delete(ctx) {
    const { id } = ctx.params;
    const { populate } = ctx.query;
    const workflowService = getService('workflows');
    const sanitizer = sanitizeWorkflow({ strapi }, ctx.state.userAbility);

    const workflow = await workflowService.findById(id, { populate: ['stages'] });
    if (!workflow) {
      return ctx.notFound("Workflow doesn't exist");
    }

    const deletedWorkflow = await workflowService.delete(workflow, { populate });

    ctx.body = {
      data: await sanitizer(deletedWorkflow),
    };
  },

  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const { populate, filters, sort } = ctx.query;
    const workflowService = getService('workflows');
    const sanitizer = sanitizeWorkflow({ strapi }, ctx.state.userAbility);

    const workflows = await workflowService.find({
      populate,
      filters,
      sort,
    });

    ctx.body = {
      data: await mapAsync(workflows, sanitizer),
    };
  },
  /**
   * Get one workflow based on its id contained in request parameters
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findById(ctx) {
    const { id } = ctx.params;
    const { populate } = ctx.query;
    const sanitizer = sanitizeWorkflow({ strapi }, ctx.state.userAbility);

    const workflowService = getService('workflows');
    const workflow = await workflowService.findById(id, { populate });

    ctx.body = {
      data: await sanitizer(workflow),
    };
  },
};
