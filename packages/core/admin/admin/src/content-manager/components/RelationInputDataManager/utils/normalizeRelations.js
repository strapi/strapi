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

 */

/**
 * Applies some transformations to existing and new relations in order to display them correctly
 *
 * @param {{ data?: { pages?: [{results: []}] } }} relations - raw relations data coming from useRelations
 * @param {{ modifiedData?: { connect: [], disconnect: [] }, shouldAddLink?: boolean, mainFieldName: string, targetModel: string }} options
 *
 * shouldAddLink: comes from generateRelationQueryInfos, if true we display a link to the relation (TODO:: explanation)
 * mainFieldName: name of the main field inside the relation (e.g. text field), if no displayable main field exists (e.g. date field) we use the id of the entry
 * targetModel: the model on which the relation is based on, used to create an URL link
 */
export const normalizeRelations = (
  relations,
  { modifiedData = {}, shouldAddLink = false, mainFieldName, targetModel }
) => {
  const { data } = relations;
  const { pages: relationsPages = [] } = data ?? {};

  const { connect = [], disconnect = [], results: modifiedDataResults = [] } = modifiedData;

  const [initialRelationsPage] = relationsPages;

  /**
   * When relations are mutated and updated in the document, the current "fetched" version is
   * temporarily out of date (whilst being fetched), so we use the modifiedData to render the relations
   * until the `relations` data is in sync with the browser data.
   */
  const mismatchInRelations =
    modifiedDataResults.length > 0 &&
    initialRelationsPage &&
    Array.isArray(initialRelationsPage.results) &&
    initialRelationsPage.results.length !== modifiedDataResults.length;

  /**
   * So, depending on the above boolean, we either use the modifiedData or the relations data
   */
  const pagesToMutate = mismatchInRelations
    ? [{ results: modifiedDataResults }]
    : [...relationsPages.reverse(), ...(connect.length > 0 ? [{ results: connect }] : [])];

  return {
    ...relations,
    data: {
      pages: pagesToMutate
        .map((page) =>
          page.results
            .filter(
              (relation) =>
                !disconnect.find((disconnectRelation) => disconnectRelation.id === relation.id)
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
        .filter((page) => page.length > 0),
    },
  };
};
