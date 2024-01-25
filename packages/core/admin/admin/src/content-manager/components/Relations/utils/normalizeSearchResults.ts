import { normalizeRelation, type NormalizeRelationArgs } from './normalizeRelations';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

export const normalizeSearchResults = (
  relations: Contracts.Relations.FindAvailable.Response['results'] = [],
  { mainFieldName }: Pick<NormalizeRelationArgs, 'mainFieldName'>
) => {
  return relations
    .map((relation) =>
      normalizeRelation(relation, { mainFieldName, shouldAddLink: false, targetModel: '' })
    )
    .filter(Boolean)
    .flat();
};
