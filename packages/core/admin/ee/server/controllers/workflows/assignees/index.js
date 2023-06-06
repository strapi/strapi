'use strict';

const { ApplicationError } = require('@strapi/utils/lib/errors');
const { getService } = require('../../../utils');
const { hasReviewWorkflow } = require('../../../utils/review-workflows');
const { validateUpdateAssigneeOnEntity } = require('../../../validation/review-workflows');

module.exports = {
  /**
   * Updates an entity's assignee.
   * @async
   * @param {Object} ctx - The Koa context object.
   * @param {Object} ctx.params - An object containing the parameters from the request URL.
   * @param {string} ctx.params.model_uid - The model UID of the entity.
   * @param {string} ctx.params.id - The ID of the entity to update.
   * @param {Object} ctx.request.body.data - Optional data object containing the new assignee ID for the entity.
   * @param {string} ctx.request.body.data.id - The ID of the new assignee for the entity.
   * @throws {ApplicationError} If review workflows is not activated on the specified model UID.
   * @throws {ValidationError} If the `data` object in the request body fails to pass validation.
   * @returns {Promise<void>} A promise that resolves when the entity's assignee has been updated.
   */
  async updateEntity(ctx) {
    const assigneeService = getService('assignees');
    const { model_uid: modelUID, id: entityIdString } = ctx.params;
    const entityId = Number(entityIdString);

    const { id: assigneeId } = await validateUpdateAssigneeOnEntity(
      ctx.request?.body?.data,
      'You should pass an id to the body of the put request.'
    );

    if (!hasReviewWorkflow({ strapi }, modelUID)) {
      throw new ApplicationError(`Review workflows is not activated on ${modelUID}.`);
    }

    const data = await assigneeService.updateEntity({ id: entityId, modelUID }, assigneeId);

    ctx.body = { data };
  },
};
