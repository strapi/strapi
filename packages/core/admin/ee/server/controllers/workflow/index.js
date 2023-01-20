'use strict';

const { pick } = require('lodash/fp');

function sanitizeWorkflowQuery(query = {}) {
  const picker = pick(['id']);
  return picker(query);
}

module.exports = {
  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  list(ctx) {
    const query = sanitizeWorkflowQuery(ctx.query);
    const workflows = strapi.query('admin::workflow').findMany(query);

    ctx.body = {
      results: workflows,
    };
  },
  /**
   * Get one workflow
   * @param {import('koa').BaseContext} ctx - koa context
   */
  getOne(ctx) {
    const query = sanitizeWorkflowQuery(ctx.query);
    const workflow = strapi.query('admin::workflow').findOne({ where: query });

    ctx.body = {
      data: workflow,
    };
  },
};
