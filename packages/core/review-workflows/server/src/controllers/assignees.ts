import type { Context } from 'koa';

import { getService } from '../utils';
import { validateUpdateAssigneeOnEntity, validateLocale } from '../validation/review-workflows';
import { ENTITY_STAGE_ATTRIBUTE, STAGE_TRANSITION_UID } from '../constants/workflows';

// TODO @Nico Controllers stay plain objects and read the global `strapi`: user extensions patch
// `plugin.controllers.<name>.<action>` on the raw plugin object before core resolves factories, so a
// factory would break them (see __tests__/plugin-shape.vitest.test.ts).

export default {
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
  async updateEntity(ctx: Context) {
    const assigneeService = getService('assignees', { strapi });
    const workflowService = getService('workflows', { strapi });
    const stagePermissions = getService('stage-permissions', { strapi });

    const { model_uid: model, id: documentId } = ctx.params;
    const locale = (await validateLocale(ctx.request.query?.locale)) ?? undefined;

    const { sanitizeOutput } = strapi
      .plugin('content-manager')
      .service('permission-checker')
      .create({ userAbility: ctx.state.userAbility, model });

    // Retrieve the entity so we can get its current stage
    const entity = await strapi.documents(model).findOne({
      documentId,
      locale,
      populate: [ENTITY_STAGE_ATTRIBUTE],
    });

    if (!entity) {
      ctx.throw(404, 'Entity not found');
    }

    // Only allow users who can update the current stage to change the assignee
    const canTransitionStage = stagePermissions.can(
      STAGE_TRANSITION_UID,
      entity[ENTITY_STAGE_ATTRIBUTE]?.id
    );

    if (!canTransitionStage) {
      ctx.throw(403, 'Stage transition permission is required');
    }

    // TODO: check if user has update permission on the entity
    const { id: assigneeId } = await validateUpdateAssigneeOnEntity(
      ctx.request?.body?.data,
      'You should pass a valid id to the body of the put request.'
    );

    await workflowService.assertContentTypeBelongsToWorkflow(model);

    const updatedEntity = await assigneeService.updateEntityAssignee(entity, model, assigneeId);

    ctx.body = { data: await sanitizeOutput(updatedEntity) };
  },
};
