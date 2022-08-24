import { getRelationLink } from './getRelationLink';

export const normalizeRelations = (
  relations,
  { deletions, shouldAddLink, mainFieldName, targetModel }
) => {
  return {
    data: {
      pages: relations.data.pages
        .map((page) =>
          page
            .map((relation) => {
              const nextRelation = { ...relation };

              if (deletions.find((deletion) => deletion.id === nextRelation.id)) {
                return null;
              }

              if (shouldAddLink) {
                nextRelation.href = getRelationLink(targetModel, nextRelation.id);
              }

              nextRelation.isDraft = !nextRelation.publishedAt;
              nextRelation.mainField = nextRelation[mainFieldName];

              return nextRelation;
            })
            .filter(Boolean)
        )
        .filter((page) => page.length > 0),
    },
  };
};
