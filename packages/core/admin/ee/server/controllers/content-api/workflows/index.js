'use strict';

const { sanitize } = require('@strapi/utils');
const { getService } = require('../../../utils');
const { WORKFLOW_MODEL_UID } = require('../../../constants/workflows');

function sanitizeOuput({ strapi }, data, ctx) {
  const schema = strapi.getModel(WORKFLOW_MODEL_UID);
  const { auth } = ctx.state;

  return sanitize.contentAPI.output(data, schema, { auth });
}
function sanitizeQuery({ strapi }, data, ctx) {
  const schema = strapi.getModel(WORKFLOW_MODEL_UID);
  const { auth } = ctx.state;

  return sanitize.contentAPI.query(data, schema, { auth });
}

module.exports = {
  /**
   * List all workflows
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const params = await sanitizeQuery({ strapi }, ctx.query, ctx);
    const workflowService = getService('workflows');
    const data = await workflowService.find({
      populate: params.populate,
    });

    ctx.body = {
      data: await sanitizeOuput({ strapi }, data, ctx),
    };
  },
  /**
   * Get one workflow based on its id contained in request parameters
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findById(ctx) {
    const { id } = ctx.params;
    const params = await sanitizeQuery({ strapi }, ctx.query, ctx);

    const workflowService = getService('workflows');
    const data = await workflowService.findById(id, { populate: params.populate });

    ctx.body = {
      data: await sanitizeOuput({ strapi }, data, ctx),
    };
  },
};
