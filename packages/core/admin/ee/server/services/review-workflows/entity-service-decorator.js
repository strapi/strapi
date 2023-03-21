'use strict';

const { hasRWEnabled } = require('../../utils/review-workflows');
const { getService } = require('../../utils');

/**
 * Decorates the entity service with RW business logic
 * @param {object} service - entity service
 */
const decorator = (service) => ({
  async create(uid, opts = {}) {
    const model = strapi.getModel(uid);

    const hasRW = hasRWEnabled(model);

    const entity = await service.create.call(this, uid, opts);
    if (!hasRW) {
      return;
    }

    const { assignEntityDefaultStage } = getService('review-workflows');
    // Assign this entity to the default workflow stage
    await assignEntityDefaultStage(uid, entity.id);

    return entity;
  },
});

module.exports = () => ({
  decorator,
});
