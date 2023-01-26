'use strict';

const { merge } = require('lodash/fp');
const { getService, mapObject } = require('../../utils');

function sanitizeWorkflowQuery(query = {}) {
  return mapObject(query, {
    pick: ['workflow_id'],
    rename: { workflow_id: 'id' },
  });
}

module.exports = {
  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const query = sanitizeWorkflowQuery(merge(ctx.query, ctx.params));

    const workflowService = getService('workflows');
    const results = await workflowService.find(query);

    ctx.body = {
      results,
    };
  },
  /**
   * Get one workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findOne(ctx) {
    const query = sanitizeWorkflowQuery(merge(ctx.query, ctx.params));

    const workflowService = getService('workflows');
    const data = await workflowService.findOne(query);

    ctx.body = {
      data,
    };
  },
};
