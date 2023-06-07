'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
const { isNil } = require('lodash/fp');
const { ENTITY_ASSIGNEE_ATTRIBUTE } = require('../../constants/workflows');
const { getService } = require('../../utils');

module.exports = () => {
  return {
    /**
     * Update the assignee of an entity
     */
    async updateEntityAssignee(id, model, assigneeId) {
      if (isNil(assigneeId)) {
        return this.deleteEntityAssignee(id, model);
      }

      const userExists = await getService('user').exists({ id: assigneeId });

      if (!userExists) {
        throw new ApplicationError(`Selected user does not exist`);
      }

      return strapi.entityService.update(model, id, {
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: assigneeId },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });
    },

    async deleteEntityAssignee(id, model) {
      return strapi.entityService.update(model, id, {
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: null },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });
    },
  };
};
