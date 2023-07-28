'use strict';

const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../../utils');
const { validateUpdateStageOnEntity } = require('../../../validation/review-workflows');
const { STAGE_MODEL_UID } = require('../../../constants/workflows');

/**
 *
 * @param { Strapi } strapi - Strapi instance
 * @param userAbility
 * @return { (Stage) => SanitizedStage }
 */
function sanitizeStage({ strapi }, userAbility) {
  const permissionChecker = strapi
    .plugin('content-manager')
    .service('permission-checker')
    .create({ userAbility, model: STAGE_MODEL_UID });

  return (entity) => permissionChecker.sanitizeOutput(entity);
}

module.exports = {
  /**
   * List all stages
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async find(ctx) {
    const { workflow_id: workflowId } = ctx.params;
    const { populate } = ctx.query;
    const stagesService = getService('stages');
    const sanitizer = sanitizeStage({ strapi }, ctx.state.userAbility);

    const stages = await stagesService.find({
      workflowId,
      populate,
    });

    ctx.body = {
      data: await mapAsync(stages, sanitizer),
    };
  },
  /**
   * Get one stage
   * @param {import('koa').BaseContext} ctx - koa context
   */
  async findById(ctx) {
    const { id, workflow_id: workflowId } = ctx.params;
    const { populate } = ctx.query;
    const stagesService = getService('stages');
    const sanitizer = sanitizeStage({ strapi }, ctx.state.userAbility);

    const stage = await stagesService.findById(id, {
      workflowId,
      populate,
    });

    ctx.body = {
      data: await sanitizer(stage),
    };
  },

  /**
   * Updates an entity's stage.
   * @async
   * @param {Object} ctx - The Koa context object.
   * @param {Object} ctx.params - An object containing the parameters from the request URL.
   * @param {string} ctx.params.model_uid - The model UID of the entity.
   * @param {string} ctx.params.id - The ID of the entity to update.
   * @param {Object} ctx.request.body.data - Optional data object containing the new stage ID for the entity.
   * @param {string} ctx.request.body.data.id - The ID of the new stage for the entity.
   * @throws {ApplicationError} If review workflows is not activated on the specified model UID.
   * @throws {ValidationError} If the `data` object in the request body fails to pass validation.
   * @returns {Promise<void>} A promise that resolves when the entity's stage has been updated.
   */
  async updateEntity(ctx) {
    const stagesService = getService('stages');
    const workflowService = getService('workflows');

    const { model_uid: modelUID, id: entityIdString } = ctx.params;
    const { body } = ctx.request;

    const entityId = Number(entityIdString);

    const { sanitizeOutput } = strapi
      .plugin('content-manager')
      .service('permission-checker')
      .create({ userAbility: ctx.state.userAbility, model: modelUID });

    const { id: stageId } = await validateUpdateStageOnEntity(
      { id: Number(body?.data?.id) },
      'You should pass an id to the body of the put request.'
    );

    const workflow = await workflowService.assertContentTypeBelongsToWorkflow(modelUID);
    workflowService.assertStageBelongsToWorkflow(stageId, workflow);

    const entity = await stagesService.updateEntity({ id: entityId, modelUID }, stageId);

    ctx.body = { data: await sanitizeOutput(entity) };
  },
};
