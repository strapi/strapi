import { normalizeRelation, type NormalizeRelationArgs } from './normalizeRelations';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { UseInfiniteQueryResult } from 'react-query';

export const normalizeSearchResults = (
  relations: UseInfiniteQueryResult<Contracts.Relations.FindAvailable.Response | null, unknown>,
  { mainFieldName }: Pick<NormalizeRelationArgs, 'mainFieldName'>
) => {
  const { data } = relations;
  const { pages = [] } = data ?? {};

  return {
    ...relations,
    data: pages
      .map((page) =>
        (page?.results ?? []).map((relation) =>
          normalizeRelation(relation, { mainFieldName, shouldAddLink: false, targetModel: '' })
        )
      )
      .filter(Boolean)
      .flat(),
  };
};
