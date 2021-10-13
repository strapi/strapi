'use strict';

const { getService } = require('../../utils');
const { formatConditions } = require('../../controllers/formatters');

module.exports = {
  async getAll(ctx) {
    const { sectionsBuilder, actionProvider, conditionProvider } = getService('permission');

    const actions = actionProvider.values();
    const conditions = conditionProvider.values();
    const sections = await sectionsBuilder.build(actions);

    ctx.body = {
      data: {
        conditions: formatConditions(conditions),
        sections,
      },
    };
  },
};
