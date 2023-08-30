'use strict';

const { update, map, property } = require('lodash/fp');
const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../utils');

const {
  validateWorkflowCreate,
  validateWorkflowUpdate,
} = require('../../validation/review-workflows');
const { WORKFLOW_MODEL_UID, WORKFLOW_POPULATE } = require('../../constants/workflows');

/**
 *
 * @param { Strapi } strapi - Strapi instance
 * @param userAbility
 * @return { PermissionChecker }
 */
function getPermissionChecker({ strapi }, userAbility, uid = WORKFLOW_MODEL_UID) {
  return strapi
    .plugin('content-manager')
    .service('permission-checker')
    .create({ userAbility, model: uid });
}

/**
 * Transforms workflow to an admin UI format.
 * Some attributes (like permissions) are presented in a different format in the admin UI.
 * @param {Workflow} workflow
 */
function formatWorkflowToAdmin(workflow) {
  if (!workflow) return;
  if (!workflow.stages) return workflow;

  // Transform permissions roles to be the id string instead of an object
  const transformPermissions = map(update('role', property('id')));
  const transformStages = map(update('permissions', transformPermissions));
  return update('stages', transformStages, workflow);
}

module.exports = {
  /**
   * Create a new workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async create(ctx) {
    const { body, query } = ctx.request;
    const { sanitizeCreateInput, sanitizeOutput, sanitizedQuery } = getPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.create(query);

    const workflowBody = await validateWorkflowCreate(body.data);

    const workflowService = getService('workflows');
    const createdWorkflow = await workflowService
      .create({
        data: await sanitizeCreateInput(workflowBody),
        populate,
      })
      .then(formatWorkflowToAdmin);

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
    const { sanitizeUpdateInput, sanitizeOutput, sanitizedQuery } = getPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.update(query);
    const workflowBody = await validateWorkflowUpdate(body.data);

    // Find if workflow exists
    const workflow = await workflowService.findById(id, { populate: WORKFLOW_POPULATE });
    if (!workflow) {
      return ctx.notFound();
    }

    // Sanitize input data
    const getPermittedFieldToUpdate = sanitizeUpdateInput(workflow);
    const dataToUpdate = await getPermittedFieldToUpdate(workflowBody);

    // Update workflow
    const updatedWorkflow = await workflowService
      .update(workflow, {
        data: dataToUpdate,
        populate,
      })
      .then(formatWorkflowToAdmin);

    // Send sanitized response
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
    const { sanitizeOutput, sanitizedQuery } = getPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.delete(query);

    const workflow = await workflowService.findById(id, { populate: WORKFLOW_POPULATE });
    if (!workflow) {
      return ctx.notFound("Workflow doesn't exist");
    }

    const deletedWorkflow = await workflowService
      .delete(workflow, { populate })
      .then(formatWorkflowToAdmin);

    ctx.body = {
      data: await sanitizeOutput(deletedWorkflow),
    };
  },

  /**
   * Determine whether the user has the permission to read the content types
   * @param userAbility
   * @param {array} workflows
   * @returns {boolean}
   */
  checkWorkflowContentTypesPermissions(userAbility, workflows) {
    const uniqueContentTypes = new Set();

    for (const workflow of workflows) {
      const { contentTypes = [] } = workflow;

      for (const contentType of contentTypes) {
        uniqueContentTypes.add(contentType);
      }
    }

    for (const contentType of uniqueContentTypes) {
      const modelPermissionChecker = getPermissionChecker({ strapi }, userAbility, contentType);

      if (modelPermissionChecker.cannot.read()) {
        return false;
      }
    }

    return true;
  },

  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const { query } = ctx.request;
    const workflowService = getService('workflows');
    const { sanitizeOutput, sanitizedQuery } = getPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate, filters, sort } = await sanitizedQuery.read(query);

    const [workflows, workflowCount] = await Promise.all([
      workflowService.find({ populate, filters, sort }).then(map(formatWorkflowToAdmin)),
      workflowService.count(),
    ]);

    if (!this.checkWorkflowContentTypesPermissions(ctx.state.userAbility, workflows)) {
      return ctx.forbidden();
    }

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
    const { sanitizeOutput, sanitizedQuery } = getPermissionChecker(
      { strapi },
      ctx.state.userAbility
    );
    const { populate } = await sanitizedQuery.read(query);

    const workflowService = getService('workflows');

    const [workflow, workflowCount] = await Promise.all([
      workflowService.findById(id, { populate }).then(formatWorkflowToAdmin),
      workflowService.count(),
    ]);

    if (!this.checkWorkflowContentTypesPermissions(ctx.state.userAbility, [workflow])) {
      return ctx.forbidden();
    }

    ctx.body = {
      data: await sanitizeOutput(workflow),
      meta: { workflowCount },
    };
  },
};
