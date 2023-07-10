'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
const { isNil } = require('lodash/fp');
const { ENTITY_ASSIGNEE_ATTRIBUTE } = require('../../constants/workflows');
const { getService } = require('../../utils');

module.exports = ({ strapi }) => {
  const metrics = getService('review-workflows-metrics', { strapi });

  return {
    async findEntityAssigneeId(id, model) {
      const entity = await strapi.entityService.findOne(model, id, {
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });

      return entity?.[ENTITY_ASSIGNEE_ATTRIBUTE]?.id ?? null;
    },

    /**
     * Update the assignee of an entity
     */
    async updateEntityAssignee(id, model, assigneeId) {
      if (isNil(assigneeId)) {
        return this.deleteEntityAssignee(id, model);
      }

      const userExists = await getService('user', { strapi }).exists({ id: assigneeId });

      if (!userExists) {
        throw new ApplicationError(`Selected user does not exist`);
      }

      metrics.sendDidEditAssignee(await this.findEntityAssigneeId(id, model), assigneeId);

      return strapi.entityService.update(model, id, {
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: assigneeId },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });
    },

    async deleteEntityAssignee(id, model) {
      metrics.sendDidEditAssignee(await this.findEntityAssigneeId(id, model), null);

      return strapi.entityService.update(model, id, {
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: null },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });
    },
  };
};
