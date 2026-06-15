import type { UID } from '@strapi/types';
import {
  contentTypes,
  buildPublicationFilterWhere,
  parsePublicationFilter,
  type PublicationFilterMode,
} from '@strapi/utils';

export { parsePublicationFilter };
export type { PublicationFilterMode };

export const getPublicationFilterCondition = (
  uid: UID.Schema,
  mode: PublicationFilterMode,
  status: 'draft' | 'published'
): Record<string, unknown> | null => {
  const model = strapi.getModel(uid);

  if (!model || !contentTypes.hasDraftAndPublish(model)) {
    return null;
  }

  const knex = strapi.db.connection;
  const meta = strapi.db.metadata.get(uid);

  return buildPublicationFilterWhere(knex, meta, model, mode, status);
};
