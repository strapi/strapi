import { getRelationLink } from './getRelationLink';

import { PUBLICATION_STATES } from '../constants';

const normalizeRelation = (
  relation,
  { modifiedData, shouldAddLink, mainFieldName, targetModel }
) => {
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
};

export const normalizeRelations = (
  relations,
  { modifiedData = {}, shouldAddLink = false, mainFieldName, targetModel }
) => {
  return {
    ...relations,
    data: {
      pages:
        [
          ...(relations?.data?.pages ?? []),
          ...(modifiedData?.connect ? [{ results: modifiedData?.connect }] : []),
        ]
          ?.map((page) =>
            page?.results
              .map((relation) =>
                normalizeRelation(relation, {
                  modifiedData,
                  shouldAddLink,
                  mainFieldName,
                  targetModel,
                })
              )
              .filter(Boolean)
          )
          ?.filter((page) => page.length > 0)
          ?.reverse() ?? [],
    },
  };
};
