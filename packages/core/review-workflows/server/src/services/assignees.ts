import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';
import { isNil } from 'lodash/fp';
import { ENTITY_ASSIGNEE_ATTRIBUTE } from '../constants/workflows';
import { getService, getAdminService } from '../utils';

const { ApplicationError } = errors;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const metrics = getService('workflow-metrics', { strapi });

  return {
    async findEntityAssigneeId(id: string, model: UID.ContentType) {
      const entity = await strapi.db.query(model).findOne({
        where: { id },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        select: [],
      });

      return entity?.[ENTITY_ASSIGNEE_ATTRIBUTE]?.id ?? null;
    },

    /**
     * Update the assignee of an entity
     */
    async updateEntityAssignee(
      documentId: string,
      locale: string,
      model: UID.ContentType,
      assigneeId: string
    ) {
      if (isNil(assigneeId)) {
        return this.deleteEntityAssignee(documentId, locale, model);
      }

      const userExists = await getAdminService('user', { strapi }).exists({ id: assigneeId });

      if (!userExists) {
        throw new ApplicationError(`Selected user does not exist`);
      }

      metrics.sendDidEditAssignee(await this.findEntityAssigneeId(documentId, model), assigneeId);

      return strapi.documents(model).update({
        documentId,
        locale,
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: assigneeId },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });
    },

    async deleteEntityAssignee(documentId: string, locale: string, model: UID.ContentType) {
      metrics.sendDidEditAssignee(await this.findEntityAssigneeId(documentId, model), null);

      return strapi.documents(model).update({
        documentId,
        locale,
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: null },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });
    },
  };
};
