import { normalizeRelation } from './normalizeRelations';

export const normalizeSearchResults = (relations, { mainFieldName }) => {
  const { data } = relations;
  const { pages = [] } = data ?? {};

  return {
    ...relations,
    data: pages
      .map((page) =>
        page?.results.map((relation) => normalizeRelation(relation, { mainFieldName }))
      )
      .filter(Boolean)
      .flat(),
  };
};
