'use strict';

const { isNil, isNull } = require('lodash/fp');
const { ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');
const { WORKFLOW_UPDATE_STAGE } = require('../../constants/webhookEvents');
const { hasReviewWorkflow, getDefaultWorkflow } = require('../../utils/review-workflows');

/**
 * Assigns the entity data to the default workflow stage if no stage is present in the data
 * @param {Object} data
 * @returns
 */
const getDataWithStage = async (data) => {
  if (!isNil(ENTITY_STAGE_ATTRIBUTE, data)) {
    const defaultWorkflow = await getDefaultWorkflow({ strapi });
    return { ...data, [ENTITY_STAGE_ATTRIBUTE]: defaultWorkflow.stages[0].id };
  }
  return data;
};

/**
 * Decorates the entity service with RW business logic
 * @param {object} service - entity service
 */
const decorator = (service) => ({
  async create(uid, opts = {}) {
    const hasRW = hasReviewWorkflow({ strapi }, uid);

    if (!hasRW) {
      return service.create.call(this, uid, opts);
    }

    const data = await getDataWithStage(opts.data);
    return service.create.call(this, uid, { ...opts, data });
  },
  async update(uid, entityId, opts = {}) {
    const hasRW = hasReviewWorkflow({ strapi }, uid);

    if (!hasRW) {
      return service.update.call(this, uid, entityId, opts);
    }

    // Prevents the stage from being set to null
    const data = { ...opts.data };
    if (isNull(data[ENTITY_STAGE_ATTRIBUTE])) {
      delete data[ENTITY_STAGE_ATTRIBUTE];
      return service.update.call(this, uid, entityId, { ...opts, data });
    }

    const entity = await this.findOne(uid, entityId, {
      populate: {
        [ENTITY_STAGE_ATTRIBUTE]: {
          populate: {
            workflow: true,
          },
        },
      },
    });
    const previousStageId = entity?.[ENTITY_STAGE_ATTRIBUTE]?.id ?? null;

    const updatedEntity = await service.update.call(this, uid, entityId, { ...opts, data });
    if (previousStageId && previousStageId !== data[ENTITY_STAGE_ATTRIBUTE]) {
      const webhookPayload = {
        entityId,
        workflow: {
          id: entity[ENTITY_STAGE_ATTRIBUTE].workflow.id,
          stages: {
            from: previousStageId,
            to: data[ENTITY_STAGE_ATTRIBUTE],
          },
        },
      };
      await service.emitEvent.call(this, uid, WORKFLOW_UPDATE_STAGE, webhookPayload);
    }

    return updatedEntity;
  },
});

module.exports = () => ({
  decorator,
});
