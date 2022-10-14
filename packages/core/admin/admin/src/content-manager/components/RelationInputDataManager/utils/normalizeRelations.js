import { getRelationLink } from './getRelationLink';

import { PUBLICATION_STATES } from '../constants';

export const normalizeRelation = (relation, { shouldAddLink, mainFieldName, targetModel }) => {
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

/*
 * Applies some transformations to existing and new relations in order to display them correctly
 * relations: raw relations data coming from useRelations
 * shouldAddLink: comes from generateRelationQueryInfos, if true we display a link to the relation (TO FIX: explanation)
 * mainFieldName: name of the main field inside the relation (e.g. text field), if no displayable main field exists (e.g. date field) we use the id of the entry
 * targetModel: the model on which the relation is based on, used to create an URL link
 */

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
