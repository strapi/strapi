import { getRelationLink } from './getRelationLink';

import { PUBLICATION_STATES } from '../constants';

const normalizeRelation = (relation, { shouldAddLink, mainFieldName, targetModel }) => {
  const nextRelation = { ...relation };

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
  // To display oldest to newest relations we need to reverse each elements in array of results
  // and reverse each arrays itself
  const existingRelationsReversed = [...(relations?.data?.pages ?? [])]
    .map((relation) => ({
      ...relation,
      results: relation.results.slice().reverse(),
    }))
    .reverse();

  return {
    ...relations,
    data: {
      pages:
        [
          ...(targetModel ? existingRelationsReversed : relations?.data?.pages ?? []),
          ...(modifiedData?.connect ? [{ results: modifiedData.connect }] : []),
        ]
          ?.map((page) =>
            page?.results
              .filter(
                (relation) =>
                  !modifiedData?.disconnect?.find(
                    (disconnectRelation) => disconnectRelation.id === relation.id
                  )
              )
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
          ?.filter((page) => page.length > 0) ?? [],
    },
  };
};
