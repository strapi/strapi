import '@strapi/types';
import { isNil } from 'lodash/fp';
import { ENTITY_STAGE_ATTRIBUTE } from '../../constants/workflows';
import { WORKFLOW_UPDATE_STAGE } from '../../constants/webhookEvents';
import { getService } from '../../utils';

/**
 * Assigns the entity data to the default workflow stage if no stage is present in the data
 * @param {Object} data
 * @returns
 */
const getDataWithStage = async (workflow: any, data: any) => {
  if (!isNil(ENTITY_STAGE_ATTRIBUTE)) {
    return { ...data, [ENTITY_STAGE_ATTRIBUTE]: workflow.stages[0].id };
  }
  return data;
};

/**
 * Get the stage information of an entity
 * @param {String} uid
 * @param {Number} id
 * @returns {Object}
 */
const getEntityStage = async (uid: any, id: any) => {
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
const decorator = (service: any) => ({
  async create(uid: any, opts: any = {}) {
    const workflow = await getService('workflows').getAssignedWorkflow(uid, {
      populate: 'stages',
    });

    if (!workflow) {
      return service.create.call(this, uid, opts);
    }

    const data = await getDataWithStage(workflow, opts.data);
    return service.create.call(this, uid, { ...opts, data });
  },
  async update(uid: any, entityId: any, opts: any = {}) {
    // Prevents the stage from being set to null
    const data = { ...opts.data };
    if (isNil(data[ENTITY_STAGE_ATTRIBUTE])) {
      delete data[ENTITY_STAGE_ATTRIBUTE];
      return service.update.call(this, uid, entityId, { ...opts, data });
    }

    const previousStage = (await getEntityStage(uid, entityId)) as any;

    const updatedEntity = await service.update.call(this, uid, entityId, { ...opts, data });
    const updatedStage = updatedEntity[ENTITY_STAGE_ATTRIBUTE];

    // Stage might be null if field is not populated
    if (updatedStage && previousStage?.id && previousStage.id !== updatedStage.id) {
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

export default () => ({
  decorator,
});
