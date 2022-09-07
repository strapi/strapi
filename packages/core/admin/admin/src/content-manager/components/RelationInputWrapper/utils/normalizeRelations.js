import { getRelationLink } from './getRelationLink';

import { PUBLICATION_STATES } from '../constants';

export const normalizeRelations = (
  relations,
  { modifiedData = {}, shouldAddLink = false, mainFieldName, targetModel }
) => {
  // TODO
  if (!relations?.data?.pages) {
    return relations;
  }

  return {
    ...relations,
    data: {
      pages: relations.data.pages
        .map((page) => [
          ...[...page.results, ...(modifiedData?.connect ?? [])]
            .map((relation) => {
              const nextRelation = { ...relation };

              if (modifiedData?.disconnect?.find((relation) => relation.id === nextRelation.id)) {
                return null;
              }

              if (shouldAddLink) {
                nextRelation.href = getRelationLink(targetModel, nextRelation.id);
              }

              nextRelation.publicationState = false;

              if (nextRelation?.publishedAt !== undefined) {
                nextRelation.publicationState = nextRelation.publishedAt
                  ? PUBLICATION_STATES.PUBLISHED
                  : PUBLICATION_STATES.DRAFT;
              }

              nextRelation.mainField = nextRelation[mainFieldName];

              return nextRelation;
            })
            .filter(Boolean),
        ])
        .filter((page) => page.length > 0),
    },
  };
};
