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
 * @return { PermissionChecker }
 */
function getWorkflowsPermissionChecker({ strapi }, userAbility) {
  return strapi
    .plugin('content-manager')
    .service('permission-checker')
    .create({ userAbility, model: WORKFLOW_MODEL_UID });
}

module.exports = {
  /**
   * Create a new workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async create(ctx) {
    const { body, query } = ctx.request;
    const { sanitizeCreateInput, sanitizeOutput, sanitizedQuery } = getWorkflowsPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.create(query);

    const workflowBody = await validateWorkflowCreate(body.data);

    const workflowService = getService('workflows');
    const createdWorkflow = await workflowService.create({
      data: await sanitizeCreateInput(workflowBody),
      populate,
    });

    ctx.body = {
      data: await sanitizeOutput(createdWorkflow),
    };
  },

  /**
   * Update a workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { body, query } = ctx.request;
    const workflowService = getService('workflows');
    const { sanitizeUpdateInput, sanitizeOutput, sanitizedQuery } = getWorkflowsPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.update(query);

    const workflowBody = await validateWorkflowUpdate(body.data);

    const workflow = await workflowService.findById(id, { populate: ['stages'] });
    if (!workflow) {
      return ctx.notFound();
    }
    const getPermittedFieldToUpdate = sanitizeUpdateInput(workflow);

    const dataToUpdate = await getPermittedFieldToUpdate(workflowBody);

    const updatedWorkflow = await workflowService.update(workflow, {
      data: dataToUpdate,
      populate,
    });

    ctx.body = {
      data: await sanitizeOutput(updatedWorkflow),
    };
  },

  /**
   * Delete a workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async delete(ctx) {
    const { id } = ctx.params;
    const { query } = ctx.request;
    const workflowService = getService('workflows');
    const { sanitizeOutput, sanitizedQuery } = getWorkflowsPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.delete(query);

    const workflow = await workflowService.findById(id, { populate: ['stages'] });
    if (!workflow) {
      return ctx.notFound("Workflow doesn't exist");
    }

    const deletedWorkflow = await workflowService.delete(workflow, { populate });

    ctx.body = {
      data: await sanitizeOutput(deletedWorkflow),
    };
  },

  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const { query } = ctx.request;
    const workflowService = getService('workflows');
    const { sanitizeOutput, sanitizedQuery } = getWorkflowsPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate, filters, sort } = await sanitizedQuery.read(query);

    const [workflows, workflowCount] = await Promise.all([
      workflowService.find({ populate, filters, sort }),
      workflowService.count(),
    ]);

    ctx.body = {
      data: await mapAsync(workflows, sanitizeOutput),
      meta: {
        workflowCount,
      },
    };
  },
  /**
   * Get one workflow based on its id contained in request parameters
   * Returns count of workflows in meta, used to prevent workflow edition when
   * max workflow count is reached for the current plan
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findById(ctx) {
    const { id } = ctx.params;
    const { query } = ctx.request;
    const { sanitizeOutput, sanitizedQuery } = getWorkflowsPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.read(query);

    const workflowService = getService('workflows');

    const [workflow, workflowCount] = await Promise.all([
      workflowService.findById(id, { populate }),
      workflowService.count(),
    ]);

    ctx.body = {
      data: await sanitizeOutput(workflow),
      meta: { workflowCount },
    };
  },
};
