import { getRelationLink } from './getRelationLink';

export const normalizeRelations = (
  relations,
  { deletions = [], shouldAddLink = false, mainFieldName, targetModel }
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

              nextRelation.publicationState = false;

              if (nextRelation?.publishedAt !== undefined) {
                nextRelation.publicationState = nextRelation.publishedAt ? 'published' : 'draft';
              }

              nextRelation.mainField = nextRelation[mainFieldName];

              return nextRelation;
            })
            .filter(Boolean)
        )
        .filter((page) => page.length > 0),
    },
  };
};
