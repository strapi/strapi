import { normalizeRelation } from './normalizeRelations';

export const normalizeSearchResults = (relations, { mainFieldName }) => {
  return {
    ...relations,
    data: {
      pages: [...(relations?.data?.pages ?? [])]?.map((page) =>
        page?.results.map((relation) => normalizeRelation(relation, { mainFieldName }))
      ),
    },
  };
};
