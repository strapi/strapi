'use strict';

const { pick, merge } = require('lodash/fp');
const { getService } = require('../../../utils');

function sanitizeStageQuery(query = {}) {
  const picker = pick(['workflow_id', 'stage_id', 'populate']);
  return picker(query);
}

module.exports = {
  /**
   * List all stages
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const query = sanitizeStageQuery(merge(ctx.query, ctx.params));

    const stagesService = getService('stages');

    const results = await stagesService.find({
      workflowId: query.workflow_id,
      populate: query.populate,
    });

    ctx.body = {
      results,
    };
  },
  /**
   * Get one stage
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findOne(ctx) {
    const query = sanitizeStageQuery(merge(ctx.query, ctx.params));

    const stagesService = getService('stages');

    const data = await stagesService.findOne(query.stage_id, {
      workflowId: query.workflow_id,
      populate: query.populate,
    });

    ctx.body = {
      data,
    };
  },
};
