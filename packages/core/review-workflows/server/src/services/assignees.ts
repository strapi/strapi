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
      entityToUpdate: {
        id: number | string;
        documentId: string;
        locale: string;
        updatedAt: string;
      },
      model: UID.ContentType,
      assigneeId: string
    ) {
      const { documentId, locale } = entityToUpdate;

      if (isNil(assigneeId)) {
        return this.deleteEntityAssignee(documentId, locale, model);
      }

      const userExists = await getAdminService('user', { strapi }).exists({ id: assigneeId });

      if (!userExists) {
        throw new ApplicationError(`Selected user does not exist`);
      }

      metrics.sendDidEditAssignee(await this.findEntityAssigneeId(documentId, model), assigneeId);

      const entity = await strapi.documents(model).update({
        documentId,
        locale,
        data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: assigneeId },
        populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
        fields: [],
      });

      // Update the `updated_at` field of the entity, so that the `status` is not considered `Modified`
      // NOTE: `updatedAt` is a protected attribute that can not be modified directly from the query layer
      //        hence the knex query builder is used here.
      const { tableName } = strapi.db.metadata.get(model);
      await strapi.db
        .connection()
        .from(tableName)
        .where({ id: entityToUpdate.id })
        .update({
          updated_at: new Date(entityToUpdate.updatedAt),
        });

      return entity;
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
