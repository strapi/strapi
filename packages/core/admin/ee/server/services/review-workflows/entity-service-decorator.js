'use strict';

const { isNil, isNull } = require('lodash/fp');
const { ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');
const { getService } = require('../../utils');

/**
 * Assigns the entity data to the default workflow stage if no stage is present in the data
 * @param {Object} data
 * @returns
 */
const getDataWithStage = async (workflow, data) => {
  if (!isNil(ENTITY_STAGE_ATTRIBUTE, data)) {
    return { ...data, [ENTITY_STAGE_ATTRIBUTE]: workflow.stages[0].id };
  }
  return data;
};

/**
 * Decorates the entity service with RW business logic
 * @param {object} service - entity service
 */
const decorator = (service) => ({
  async create(uid, opts = {}) {
    const workflow = await getService('workflows').getAssignedWorkflow(uid, {
      populate: 'stages',
    });

    if (!workflow) {
      return service.create.call(this, uid, opts);
    }

    const data = await getDataWithStage(workflow, opts.data);
    return service.create.call(this, uid, { ...opts, data });
  },
  async update(uid, entityId, opts = {}) {
    // Prevents the stage from being set to null
    const data = { ...opts.data };
    if (isNull(data[ENTITY_STAGE_ATTRIBUTE])) {
      delete data[ENTITY_STAGE_ATTRIBUTE];
    }

    return service.update.call(this, uid, entityId, { ...opts, data });
  },
});

module.exports = () => ({
  decorator,
});
