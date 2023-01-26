'use strict';

const { merge } = require('lodash/fp');
const { getService, mapObject } = require('../../../utils');

function sanitizeStageQuery(query = {}) {
  return mapObject(query, {
    pick: ['workflow_id', 'stage_id', 'populate'],
    rename: { workflow_id: 'workflowId', stage_id: 'id' },
  });
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
      workflowId: query.workflowId,
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

    const data = await stagesService.findOne(query.id, {
      workflowId: query.workflowId,
      populate: query.populate,
    });

    ctx.body = {
      data,
    };
  },
};
