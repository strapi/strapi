'use strict';

const { hasRWEnabled, getDefaultWorkflow } = require('../../utils/review-workflows');

/**
 * Decorates the entity service with RW business logic
 * @param {object} service - entity service
 */
const decorator = (service) => ({
  async create(uid, opts = {}) {
    const model = strapi.getModel(uid);
    const hasRW = hasRWEnabled(model);

    if (!hasRW) {
      return service.create.call(this, uid, opts);
    }

    const defaultWorkFlow = await getDefaultWorkflow({ strapi });

    return service.create.call(this, uid, {
      ...opts,
      // Assign this entity to the default workflow stage
      data: { ...opts.data, strapi_reviewWorkflows_stage: defaultWorkFlow.stages[0].id },
    });
  },
});

module.exports = () => ({
  decorator,
});
