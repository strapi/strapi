'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
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
    const { model_uid: model, id } = ctx.params;

    const permissionChecker = strapi
      .plugin('content-manager')
      .service('permission-checker')
      .create({ userAbility: ctx.state.userAbility, model });

    // TODO: check if user has update permission on the entity

    const { id: assigneeId } = await validateUpdateAssigneeOnEntity(
      ctx.request?.body?.data,
      'You should pass a valid id to the body of the put request.'
    );

    if (!hasReviewWorkflow({ strapi }, model)) {
      throw new ApplicationError(`Review workflows is not activated on ${model}.`);
    }

    const entity = await assigneeService.updateEntityAssignee(id, model, assigneeId);
    const sanitizedEntity = await permissionChecker.sanitizeOutput(entity);

    ctx.body = { data: sanitizedEntity };
  },
};
