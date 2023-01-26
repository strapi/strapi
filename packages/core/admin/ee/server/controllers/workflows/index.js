'use strict';

const { pick } = require('lodash/fp');
const { getService } = require('../../utils');

function sanitizeWorkflowQuery(query = {}) {
  const picker = pick(['id', 'populate']);
  return picker(query);
}

module.exports = {
  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const query = sanitizeWorkflowQuery(ctx.query);

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
    const query = sanitizeWorkflowQuery(ctx.query);

    const workflowService = getService('workflows');
    const data = await workflowService.findOne(query);

    ctx.body = {
      data,
    };
  },
};
