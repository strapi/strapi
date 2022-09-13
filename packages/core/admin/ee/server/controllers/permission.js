'use strict';

const { getService } = require('../../../server/utils');
const { formatConditions } = require('../../../server/controllers/formatters');

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
