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
 * Get the stage information of an entity
 * @param {String} uid
 * @param {Number} id
 * @returns {Object}
 */
const getEntityStage = async (uid, id) => {
  const entity = await strapi.entityService.findOne(uid, id, {
    populate: {
      [ENTITY_STAGE_ATTRIBUTE]: {
        populate: {
          workflow: true,
        },
      },
    },
  });
  return entity?.[ENTITY_STAGE_ATTRIBUTE] ?? {};
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

    const previousStage = await getEntityStage(uid, entityId);

    const updatedEntity = await service.update.call(this, uid, entityId, { ...opts, data });
    const updatedStage = updatedEntity[ENTITY_STAGE_ATTRIBUTE];

    if (previousStage?.id && previousStage.id !== updatedStage.id) {
      const model = strapi.getModel(uid);

      strapi.eventHub.emit(WORKFLOW_UPDATE_STAGE, {
        model: model.modelName,
        uid: model.uid,
        entity: {
          id: entityId,
        },
        workflow: {
          id: previousStage.workflow.id,
          stages: {
            from: {
              id: previousStage.id,
              name: previousStage.name,
            },
            to: {
              id: updatedStage.id,
              name: updatedStage.name,
            },
          },
        },
      });
    }

    return updatedEntity;
  },
});

module.exports = () => ({
  decorator,
});
