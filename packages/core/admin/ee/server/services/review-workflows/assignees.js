'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
const { ENTITY_ASSIGNEE_ATTRIBUTE } = require('../../constants/workflows');
const { getService } = require('../../utils');

module.exports = () => {
  return {
    /**
     * Update the assignee of an entity
     */
    async updateEntity(entityInfo, assigneeId) {
      const userExists = await getService('user').exists({ id: assigneeId });

      if (!userExists) {
        throw new ApplicationError(`Selected user does not exist`);
      }

      return strapi.entityService.update(entityInfo.modelUID, entityInfo.id, {
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: assigneeId },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
      });
    },
  };
};
